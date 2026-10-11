"""RFQ service for managing RFQ costing requests and milestone validation."""
from datetime import date
from typing import List, Optional
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.engineering_tracker.models.rfq import RFQ
from app.engineering_tracker.models.harness import Harness
from app.engineering_tracker.models.revision import Revision
from app.engineering_tracker.services.exceptions import (
    BusinessValidationError,
    UnresolvedQueryBlockError,
    EntityNotFoundError,
)
from app.engineering_tracker.config import (
    RFQ_PREFIX,
    RFQ_STATUS_OPEN,
    RFQ_STATUSES,
    QUERY_STATUS_OPEN,
    QUERY_STATUS_RESOLVED,
    QUERY_STATUSES,
    PROPOSAL_STATUSES,
    DEFAULT_USER,
)


class RFQService:
    """Service handling RFQ creation, query/proposal rules, and milestone validation."""

    def __init__(self, session: Session):
        self.session = session

    def generate_next_rfq_number(self, current_year: Optional[int] = None) -> str:
        """Generate unique sequential RFQ number in format RFQ-YYYY-XXXX."""
        year = current_year or date.today().year
        prefix = f"{RFQ_PREFIX}-{year}-"

        stmt = select(RFQ.rfq_number).where(RFQ.rfq_number.like(f"{prefix}%"))
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

    def create_rfq(
        self,
        harness_id: int,
        revision_id: int,
        marketing_input_date: Optional[date] = None,
        design_input_date: Optional[date] = None,
        work_start_date: Optional[date] = None,
        target_date: Optional[date] = None,
        costing_bom_submitted_date: Optional[date] = None,
        query_yes_no: bool = False,
        query_submitted_date: Optional[date] = None,
        reply_received_date: Optional[date] = None,
        query_status: Optional[str] = None,
        query_remark: Optional[str] = None,
        proposal_yes_no: bool = False,
        proposal_submitted_date: Optional[date] = None,
        proposal_status: Optional[str] = None,
        proposal_remark: Optional[str] = None,
        overall_rfq_status: str = RFQ_STATUS_OPEN,
        created_by: Optional[str] = None,
    ) -> RFQ:
        """Create a new RFQ with full Poka-Yoke validation."""
        harness = self.session.get(Harness, harness_id)
        if not harness:
            raise EntityNotFoundError(f"Harness with ID {harness_id} does not exist.")

        revision = self.session.get(Revision, revision_id)
        if not revision:
            raise EntityNotFoundError(f"Revision with ID {revision_id} does not exist.")

        if revision.harness_id != harness_id:
            raise BusinessValidationError(
                f"Revision '{revision.revision_code}' does not belong to Harness '{harness.harness_number}'."
            )

        if overall_rfq_status not in RFQ_STATUSES:
            raise BusinessValidationError(
                f"Invalid RFQ status '{overall_rfq_status}'. Must be one of {RFQ_STATUSES}."
            )

        # Query validation
        if query_yes_no:
            if query_status and query_status not in QUERY_STATUSES:
                raise BusinessValidationError(
                    f"Invalid query status '{query_status}'. Must be one of {QUERY_STATUSES}."
                )
            # Unresolved query blocking check
            if costing_bom_submitted_date and query_status != QUERY_STATUS_RESOLVED:
                raise UnresolvedQueryBlockError(
                    "Cannot record Costing BOM Submitted Date while an unresolved query exists. "
                    "Mark query as Resolved before submitting the Costing BOM."
                )
        else:
            # Clear or ensure query fields not set
            query_submitted_date = None
            reply_received_date = None
            query_status = None
            query_remark = None

        # Proposal validation
        if proposal_yes_no:
            if proposal_status and proposal_status not in PROPOSAL_STATUSES:
                raise BusinessValidationError(
                    f"Invalid proposal status '{proposal_status}'. Must be one of {PROPOSAL_STATUSES}."
                )
        else:
            proposal_submitted_date = None
            proposal_status = None
            proposal_remark = None

        rfq_number = self.generate_next_rfq_number()
        user = created_by or DEFAULT_USER

        rfq = RFQ(
            rfq_number=rfq_number,
            harness_id=harness_id,
            revision_id=revision_id,
            marketing_input_date=marketing_input_date,
            design_input_date=design_input_date,
            work_start_date=work_start_date,
            target_date=target_date,
            costing_bom_submitted_date=costing_bom_submitted_date,
            query_yes_no=query_yes_no,
            query_submitted_date=query_submitted_date,
            reply_received_date=reply_received_date,
            query_status=query_status,
            query_remark=query_remark,
            proposal_yes_no=proposal_yes_no,
            proposal_submitted_date=proposal_submitted_date,
            proposal_status=proposal_status,
            proposal_remark=proposal_remark,
            overall_rfq_status=overall_rfq_status,
            created_by=user,
            modified_by=user,
        )
        self.session.add(rfq)
        self.session.flush()
        return rfq

    def update_rfq(
        self,
        rfq_id: int,
        marketing_input_date: Optional[date] = None,
        design_input_date: Optional[date] = None,
        work_start_date: Optional[date] = None,
        target_date: Optional[date] = None,
        completion_date: Optional[date] = None,
        costing_bom_submitted_date: Optional[date] = None,
        query_yes_no: bool = False,
        query_submitted_date: Optional[date] = None,
        reply_received_date: Optional[date] = None,
        query_status: Optional[str] = None,
        query_remark: Optional[str] = None,
        proposal_yes_no: bool = False,
        proposal_submitted_date: Optional[date] = None,
        proposal_status: Optional[str] = None,
        proposal_remark: Optional[str] = None,
        overall_rfq_status: Optional[str] = None,
        modified_by: Optional[str] = None,
    ) -> RFQ:
        """Update an existing RFQ with validation."""
        rfq = self.get_rfq_by_id(rfq_id)

        if overall_rfq_status:
            if overall_rfq_status not in RFQ_STATUSES:
                raise BusinessValidationError(
                    f"Invalid RFQ status '{overall_rfq_status}'. Must be one of {RFQ_STATUSES}."
                )
            rfq.overall_rfq_status = overall_rfq_status

        # Query validation
        if query_yes_no:
            if query_status and query_status not in QUERY_STATUSES:
                raise BusinessValidationError(
                    f"Invalid query status '{query_status}'. Must be one of {QUERY_STATUSES}."
                )
            if costing_bom_submitted_date and query_status != QUERY_STATUS_RESOLVED:
                raise UnresolvedQueryBlockError(
                    "Cannot record Costing BOM Submitted Date while an unresolved query exists. "
                    "Mark query as Resolved before submitting the Costing BOM."
                )
            rfq.query_yes_no = True
            rfq.query_submitted_date = query_submitted_date
            rfq.reply_received_date = reply_received_date
            rfq.query_status = query_status
            rfq.query_remark = query_remark
        else:
            rfq.query_yes_no = False
            rfq.query_submitted_date = None
            rfq.reply_received_date = None
            rfq.query_status = None
            rfq.query_remark = None

        # Proposal validation
        if proposal_yes_no:
            if proposal_status and proposal_status not in PROPOSAL_STATUSES:
                raise BusinessValidationError(
                    f"Invalid proposal status '{proposal_status}'. Must be one of {PROPOSAL_STATUSES}."
                )
            rfq.proposal_yes_no = True
            rfq.proposal_submitted_date = proposal_submitted_date
            rfq.proposal_status = proposal_status
            rfq.proposal_remark = proposal_remark
        else:
            rfq.proposal_yes_no = False
            rfq.proposal_submitted_date = None
            rfq.proposal_status = None
            rfq.proposal_remark = None

        rfq.marketing_input_date = marketing_input_date
        rfq.design_input_date = design_input_date
        rfq.work_start_date = work_start_date
        rfq.target_date = target_date
        rfq.completion_date = completion_date
        rfq.costing_bom_submitted_date = costing_bom_submitted_date
        rfq.modified_by = modified_by or DEFAULT_USER
        self.session.flush()
        return rfq

    def get_rfq_by_id(self, rfq_id: int) -> RFQ:
        """Retrieve RFQ by ID or raise EntityNotFoundError."""
        rfq = self.session.get(RFQ, rfq_id)
        if not rfq:
            raise EntityNotFoundError(f"RFQ with ID {rfq_id} does not exist.")
        return rfq

    def list_all_rfqs(self) -> List[RFQ]:
        """List all RFQs ordered by creation ID descending."""
        stmt = select(RFQ).order_by(RFQ.id.desc())
        return list(self.session.execute(stmt).scalars().all())

    def list_rfqs_for_harness(self, harness_id: int) -> List[RFQ]:
        """List all RFQs linked to a harness."""
        stmt = select(RFQ).where(RFQ.harness_id == harness_id).order_by(RFQ.id.desc())
        return list(self.session.execute(stmt).scalars().all())
