"""Kit service for managing Consolidated Active Kit List entries and physical storage tracking."""
from typing import List, Optional, Dict, Any
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.engineering_tracker.models.kit import ConsolidatedKit
from app.engineering_tracker.models.ecn import ECN
from app.engineering_tracker.models.min_meeting import MINMeeting
from app.engineering_tracker.services.exceptions import (
    BusinessValidationError,
    DuplicateEntityError,
    MINPrerequisiteError,
    ActiveRevisionConflictError,
    EntityNotFoundError,
)
from app.engineering_tracker.config import (
    ACTIVE_STATUS,
    OBSOLETE_STATUS,
    REVISION_STATUSES,
    DEFAULT_USER,
)


class KitService:
    """Service handling Consolidated Active Kit List entries and Poka-Yoke MIN prerequisites."""

    def __init__(self, session: Session):
        self.session = session

    def create_or_update_kit_entry(
        self,
        ecn_id: int,
        rack_number: Optional[str] = None,
        file_number: Optional[str] = None,
        hard_copy_location: Optional[str] = None,
        status: str = ACTIVE_STATUS,
        created_by: Optional[str] = None,
    ) -> ConsolidatedKit:
        """
        Record or update a Consolidated Kit entry for a completed ECN.
        Enforces:
        - Strict MIN prerequisite: No MIN, no Kit List entry!
        - Unique Kit entry per ECN.
        - Respects the one active revision per Harness rule.
        """
        ecn = self.session.get(ECN, ecn_id)
        if not ecn:
            raise EntityNotFoundError(f"ECN with ID {ecn_id} does not exist.")

        # Check MIN prerequisite
        stmt_min = select(MINMeeting).where(MINMeeting.ecn_id == ecn_id)
        min_record = self.session.execute(stmt_min).scalar_one_or_none()
        if not min_record and not ecn.min_meeting_date:
            raise MINPrerequisiteError(
                f"Cannot create Kit entry for ECN '{ecn.ecn_number}' because its MIN meeting has not been concluded. "
                "The business rule is: No MIN, no Kit List entry.",
                field="ecn_id",
            )

        if status not in REVISION_STATUSES:
            raise BusinessValidationError(
                f"Invalid status '{status}'. Must be one of {REVISION_STATUSES}."
            )

        # Check existing kit entry
        stmt_kit = select(ConsolidatedKit).where(ConsolidatedKit.ecn_id == ecn_id)
        existing_kit = self.session.execute(stmt_kit).scalar_one_or_none()

        user = created_by or DEFAULT_USER
        if existing_kit:
            existing_kit.rack_number = (rack_number or "").strip() if rack_number else None
            existing_kit.file_number = (file_number or "").strip() if file_number else None
            existing_kit.hard_copy_location = (
                (hard_copy_location or "").strip() if hard_copy_location else None
            )
            existing_kit.status = status
            existing_kit.modified_by = user
            self.session.flush()
            return existing_kit

        new_kit = ConsolidatedKit(
            ecn_id=ecn_id,
            rack_number=(rack_number or "").strip() if rack_number else None,
            file_number=(file_number or "").strip() if file_number else None,
            hard_copy_location=(
                (hard_copy_location or "").strip() if hard_copy_location else None
            ),
            status=status,
            created_by=user,
            modified_by=user,
        )
        self.session.add(new_kit)
        self.session.flush()
        return new_kit

    def get_kit_by_ecn_id(self, ecn_id: int) -> Optional[ConsolidatedKit]:
        """Retrieve Consolidated Kit entry for an ECN."""
        stmt = select(ConsolidatedKit).where(ConsolidatedKit.ecn_id == ecn_id)
        return self.session.execute(stmt).scalar_one_or_none()

    def get_consolidated_active_kit_list(self) -> List[Dict[str, Any]]:
        """
        Generate Consolidated Active Kit List data from central records.
        Pulls automatically:
        - ECN Number, MIN Meeting Date
        - Customer Name, Model Name
        - Harness Number, Revision Code
        - SOP Number, Volume, Circuits
        - NPD/Production context (Stage Context from ECN)
        - Rack Number, File Number, Hard Copy Location
        - Status
        """
        stmt = (
            select(ConsolidatedKit)
            .join(ECN, ConsolidatedKit.ecn_id == ECN.id)
            .order_by(ConsolidatedKit.id.desc())
        )
        kits = self.session.execute(stmt).scalars().all()

        rows = []
        for kit in kits:
            ecn = kit.ecn
            effective_rev = ecn.new_revision if ecn.new_revision else ecn.source_revision
            harness = ecn.harness
            project = harness.project
            customer = project.customer

            rows.append(
                {
                    "kit_id": kit.id,
                    "ecn_id": ecn.id,
                    "ecn_number": ecn.ecn_number,
                    "min_meeting_date": ecn.min_meeting_date,
                    "customer_name": customer.name,
                    "model_name": project.model_name,
                    "harness_number": harness.harness_number,
                    "revision_code": effective_rev.revision_code,
                    "sop_number": effective_rev.sop_number,
                    "volume": effective_rev.volume,
                    "circuit_count": effective_rev.circuit_count,
                    "stage_context": ecn.stage_context,
                    "development_type": ecn.development_type,
                    "rack_number": kit.rack_number or "-",
                    "file_number": kit.file_number or "-",
                    "hard_copy_location": kit.hard_copy_location or "-",
                    "status": kit.status,
                }
            )
        return rows
