"""ECN service for managing engineering change orders and Poka-Yoke validations."""
from datetime import date
from typing import List, Optional
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.engineering_tracker.models.ecn import ECN
from app.engineering_tracker.models.harness import Harness
from app.engineering_tracker.models.revision import Revision
from app.engineering_tracker.models.engineer import Engineer
from app.engineering_tracker.models.rfq import RFQ
from app.engineering_tracker.services.exceptions import (
    BusinessValidationError,
    AssignmentLockedError,
    CostingRFQRequiredError,
    DelayReasonRequiredError,
    EntityNotFoundError,
)
from app.engineering_tracker.config import (
    ECN_PREFIX,
    STAGE_CONTEXTS,
    DEV_TYPES,
    REVISION_IMPACTS,
    REVISION_IMPACT_NEW,
    REVISION_IMPACT_SAME,
    ECN_STATUS_IN_PROGRESS,
    ECN_STATUSES,
    DEFAULT_USER,
)


class ECNService:
    """Service handling ECN lifecycle, costing linkage, engineer locking, and delay validation."""

    def __init__(self, session: Session):
        self.session = session

    def generate_next_ecn_number(self, current_year: Optional[int] = None) -> str:
        """Generate unique sequential ECN number in format ECN-YYYY-XXXX."""
        year = current_year or date.today().year
        prefix = f"{ECN_PREFIX}-{year}-"

        stmt = select(ECN.ecn_number).where(ECN.ecn_number.like(f"{prefix}%"))
        existing_numbers = self.session.execute(stmt).scalars().all()

        max_seq = 0
        for num in existing_numbers:
            try:
                seq = int(num.split("-")[-1])
                if seq > max_seq:
                    max_seq = seq
            except (ValueError, IndexError):
                continue

        return f"{prefix}{max_seq + 1:04d}"

    def create_ecn(
        self,
        harness_id: int,
        source_revision_id: int,
        stage_context: str,
        development_type: str,
        change_reason: str,
        primary_engineer_id: int,
        target_date: date,
        revision_impact: str = REVISION_IMPACT_SAME,
        new_revision_id: Optional[int] = None,
        costing_required: bool = False,
        rfq_id: Optional[int] = None,
        support_engineer_id: Optional[int] = None,
        design_input_date: Optional[date] = None,
        work_start_date: Optional[date] = None,
        min_meeting_date: Optional[date] = None,
        ecn_status: str = ECN_STATUS_IN_PROGRESS,
        delay_reason: Optional[str] = None,
        created_by: Optional[str] = None,
    ) -> ECN:
        """Create a new ECN with full Poka-Yoke validation."""
        # Validate Harness
        harness = self.session.get(Harness, harness_id)
        if not harness:
            raise EntityNotFoundError(f"Harness with ID {harness_id} does not exist.")

        # Validate Source Revision
        source_rev = self.session.get(Revision, source_revision_id)
        if not source_rev:
            raise EntityNotFoundError(f"Source revision with ID {source_revision_id} does not exist.")
        if source_rev.harness_id != harness_id:
            raise BusinessValidationError(
                f"Source revision '{source_rev.revision_code}' does not belong to Harness '{harness.harness_number}'."
            )

        # Validate Classifications
        if stage_context not in STAGE_CONTEXTS:
            raise BusinessValidationError(
                f"Invalid stage/context '{stage_context}'. Must be one of {STAGE_CONTEXTS}."
            )
        if development_type not in DEV_TYPES:
            raise BusinessValidationError(
                f"Invalid development type '{development_type}'. Must be one of {DEV_TYPES}."
            )
        if revision_impact not in REVISION_IMPACTS:
            raise BusinessValidationError(
                f"Invalid revision impact '{revision_impact}'. Must be one of {REVISION_IMPACTS}."
            )

        # Validate Change/Reason
        clean_reason = (change_reason or "").strip()
        if not clean_reason:
            raise BusinessValidationError("Change/Reason is mandatory for every ECN.", field="change_reason")

        # Validate Primary Engineer
        primary_eng = self.session.get(Engineer, primary_engineer_id)
        if not primary_eng:
            raise EntityNotFoundError(f"Primary engineer with ID {primary_engineer_id} does not exist.")
        if not primary_eng.is_active:
            raise BusinessValidationError(
                f"Cannot assign inactive engineer '{primary_eng.name}' as primary engineer."
            )

        if support_engineer_id:
            support_eng = self.session.get(Engineer, support_engineer_id)
            if not support_eng:
                raise EntityNotFoundError(f"Support engineer with ID {support_engineer_id} does not exist.")

        # Validate Target Date
        if not target_date:
            raise BusinessValidationError("Target Date is mandatory.", field="target_date")

        # Validate Revision Impact
        if revision_impact == REVISION_IMPACT_NEW:
            if not new_revision_id:
                raise BusinessValidationError(
                    "New Revision must be provided when Revision Impact is 'New Revision'.",
                    field="new_revision_id",
                )
            new_rev = self.session.get(Revision, new_revision_id)
            if not new_rev:
                raise EntityNotFoundError(f"New revision with ID {new_revision_id} does not exist.")
            if new_rev.harness_id != harness_id:
                raise BusinessValidationError(
                    f"New revision '{new_rev.revision_code}' does not belong to Harness '{harness.harness_number}'."
                )
        else:
            new_revision_id = None

        # Validate Costing & RFQ
        if costing_required:
            if not rfq_id:
                raise CostingRFQRequiredError(
                    "A related RFQ is mandatory when Costing Required is Yes.", field="rfq_id"
                )
            rfq = self.session.get(RFQ, rfq_id)
            if not rfq:
                raise EntityNotFoundError(f"Linked RFQ with ID {rfq_id} does not exist.")
            if rfq.harness_id != harness_id:
                raise BusinessValidationError(
                    f"Linked RFQ '{rfq.rfq_number}' belongs to a different harness."
                )

        # Date coherence
        if work_start_date and target_date and work_start_date > target_date:
            raise BusinessValidationError(
                "Work Start Date cannot be after Target Date.", field="work_start_date"
            )
        if min_meeting_date and work_start_date and min_meeting_date < work_start_date:
            raise BusinessValidationError(
                "MIN Meeting Date cannot be before Work Start Date.", field="min_meeting_date"
            )

        # Delay reason validation
        clean_delay_reason = (delay_reason or "").strip() if delay_reason else None
        if min_meeting_date and target_date and min_meeting_date > target_date:
            if not clean_delay_reason:
                raise DelayReasonRequiredError(
                    f"MIN Meeting Date ({min_meeting_date}) is later than Target Date ({target_date}). "
                    "A Delay Reason is mandatory.",
                    field="delay_reason",
                )

        completion_date = min_meeting_date if min_meeting_date else None

        if ecn_status not in ECN_STATUSES:
            raise BusinessValidationError(
                f"Invalid ECN status '{ecn_status}'. Must be one of {ECN_STATUSES}."
            )

        ecn_number = self.generate_next_ecn_number()
        user = created_by or DEFAULT_USER

        ecn = ECN(
            ecn_number=ecn_number,
            harness_id=harness_id,
            source_revision_id=source_revision_id,
            stage_context=stage_context,
            development_type=development_type,
            change_reason=clean_reason,
            revision_impact=revision_impact,
            new_revision_id=new_revision_id,
            costing_required=costing_required,
            rfq_id=rfq_id,
            primary_engineer_id=primary_engineer_id,
            support_engineer_id=support_engineer_id,
            design_input_date=design_input_date,
            work_start_date=work_start_date,
            target_date=target_date,
            min_meeting_date=min_meeting_date,
            completion_date=completion_date,
            ecn_status=ecn_status,
            delay_reason=clean_delay_reason,
            created_by=user,
            modified_by=user,
        )
        self.session.add(ecn)
        self.session.flush()
        return ecn

    def update_ecn(
        self,
        ecn_id: int,
        primary_engineer_id: Optional[int] = None,
        support_engineer_id: Optional[int] = None,
        target_date: Optional[date] = None,
        work_start_date: Optional[date] = None,
        design_input_date: Optional[date] = None,
        min_meeting_date: Optional[date] = None,
        ecn_status: Optional[str] = None,
        delay_reason: Optional[str] = None,
        change_reason: Optional[str] = None,
        costing_required: Optional[bool] = None,
        rfq_id: Optional[int] = None,
        modified_by: Optional[str] = None,
    ) -> ECN:
        """
        Update an existing ECN.
        Enforces:
        - Primary engineer cannot be reassigned after work_start_date is set!
        - Delay reason required if MIN date > target date.
        """
        ecn = self.get_ecn_by_id(ecn_id)

        # Primary engineer reassignment lock
        if primary_engineer_id is not None and primary_engineer_id != ecn.primary_engineer_id:
            if ecn.work_start_date is not None:
                raise AssignmentLockedError(
                    f"Primary Engineer cannot be reassigned after Work Start Date "
                    f"({ecn.work_start_date}) has been recorded.",
                    field="primary_engineer_id",
                )
            primary_eng = self.session.get(Engineer, primary_engineer_id)
            if not primary_eng or not primary_eng.is_active:
                raise BusinessValidationError("Selected primary engineer is invalid or inactive.")
            ecn.primary_engineer_id = primary_engineer_id

        if support_engineer_id is not None:
            ecn.support_engineer_id = support_engineer_id

        if target_date is not None:
            ecn.target_date = target_date

        if work_start_date is not None:
            ecn.work_start_date = work_start_date

        if design_input_date is not None:
            ecn.design_input_date = design_input_date

        if change_reason is not None:
            clean_reason = change_reason.strip()
            if not clean_reason:
                raise BusinessValidationError("Change/Reason cannot be empty.", field="change_reason")
            ecn.change_reason = clean_reason

        if costing_required is not None:
            ecn.costing_required = costing_required
            if costing_required and not (rfq_id or ecn.rfq_id):
                raise CostingRFQRequiredError("A related RFQ is mandatory when Costing Required is Yes.")
            if rfq_id is not None:
                ecn.rfq_id = rfq_id

        if min_meeting_date is not None:
            ecn.min_meeting_date = min_meeting_date
            ecn.completion_date = min_meeting_date

        # Date validations
        if ecn.work_start_date and ecn.target_date and ecn.work_start_date > ecn.target_date:
            raise BusinessValidationError("Work Start Date cannot be after Target Date.")
        if ecn.min_meeting_date and ecn.work_start_date and ecn.min_meeting_date < ecn.work_start_date:
            raise BusinessValidationError("MIN Meeting Date cannot be before Work Start Date.")

        # Delay reason validation
        effective_delay_reason = delay_reason if delay_reason is not None else ecn.delay_reason
        clean_delay_reason = effective_delay_reason.strip() if effective_delay_reason else None
        if ecn.min_meeting_date and ecn.target_date and ecn.min_meeting_date > ecn.target_date:
            if not clean_delay_reason:
                raise DelayReasonRequiredError(
                    f"MIN Meeting Date ({ecn.min_meeting_date}) is later than Target Date ({ecn.target_date}). "
                    "A Delay Reason is mandatory.",
                    field="delay_reason",
                )
            ecn.delay_reason = clean_delay_reason
        elif delay_reason is not None:
            ecn.delay_reason = clean_delay_reason

        if ecn_status is not None:
            if ecn_status not in ECN_STATUSES:
                raise BusinessValidationError(
                    f"Invalid ECN status '{ecn_status}'. Must be one of {ECN_STATUSES}."
                )
            ecn.ecn_status = ecn_status

        ecn.modified_by = modified_by or DEFAULT_USER
        self.session.flush()
        return ecn

    def get_ecn_by_id(self, ecn_id: int) -> ECN:
        """Retrieve ECN by ID or raise EntityNotFoundError."""
        ecn = self.session.get(ECN, ecn_id)
        if not ecn:
            raise EntityNotFoundError(f"ECN with ID {ecn_id} does not exist.")
        return ecn

    def list_all_ecns(self) -> List[ECN]:
        """List all ECNs ordered by creation ID descending."""
        stmt = select(ECN).order_by(ECN.id.desc())
        return list(self.session.execute(stmt).scalars().all())

    def list_ecns_for_harness(self, harness_id: int) -> List[ECN]:
        """List all ECNs for a harness."""
        stmt = select(ECN).where(ECN.harness_id == harness_id).order_by(ECN.id.desc())
        return list(self.session.execute(stmt).scalars().all())

    def list_ecns_for_engineer(self, engineer_id: int) -> List[ECN]:
        """List all ECNs where engineer is primary or support."""
        stmt = (
            select(ECN)
            .where(
                (ECN.primary_engineer_id == engineer_id)
                | (ECN.support_engineer_id == engineer_id)
            )
            .order_by(ECN.id.desc())
        )
        return list(self.session.execute(stmt).scalars().all())
