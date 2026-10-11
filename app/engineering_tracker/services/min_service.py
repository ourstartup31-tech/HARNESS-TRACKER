"""MIN Meeting service for managing MIN completion milestones."""
from datetime import date
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.engineering_tracker.models.min_meeting import MINMeeting
from app.engineering_tracker.models.ecn import ECN
from app.engineering_tracker.services.exceptions import (
    BusinessValidationError,
    DuplicateEntityError,
    DelayReasonRequiredError,
    EntityNotFoundError,
)
from app.engineering_tracker.config import (
    ECN_STATUS_COMPLETED,
    DEFAULT_USER,
)


class MINService:
    """Service handling MIN Meeting records and ECN completion synchronization."""

    def __init__(self, session: Session):
        self.session = session

    def record_min_meeting(
        self,
        ecn_id: int,
        meeting_date: date,
        remarks: Optional[str] = None,
        delay_reason: Optional[str] = None,
        created_by: Optional[str] = None,
    ) -> MINMeeting:
        """
        Record a MIN meeting for an ECN.
        Enforces:
        - Exactly one MIN meeting per ECN.
        - Synchronizes ECN.min_meeting_date and ECN.completion_date.
        - Enforces Delay Reason if meeting_date > ecn.target_date.
        """
        ecn = self.session.get(ECN, ecn_id)
        if not ecn:
            raise EntityNotFoundError(f"ECN with ID {ecn_id} does not exist.")

        # Check if MIN already recorded
        stmt = select(MINMeeting).where(MINMeeting.ecn_id == ecn_id)
        existing_min = self.session.execute(stmt).scalar_one_or_none()
        if existing_min:
            raise DuplicateEntityError(
                f"A MIN meeting is already recorded for ECN '{ecn.ecn_number}' on date {existing_min.meeting_date}. "
                "Only one MIN meeting is permitted per ECN in V1.",
                field="ecn_id",
            )

        if not meeting_date:
            raise BusinessValidationError("MIN Meeting Date must be provided.", field="meeting_date")

        if ecn.work_start_date and meeting_date < ecn.work_start_date:
            raise BusinessValidationError(
                f"MIN Meeting Date ({meeting_date}) cannot be earlier than Work Start Date ({ecn.work_start_date})."
            )

        # Delay check
        effective_delay_reason = delay_reason or ecn.delay_reason
        if ecn.target_date and meeting_date > ecn.target_date:
            clean_delay_reason = (effective_delay_reason or "").strip()
            if not clean_delay_reason:
                raise DelayReasonRequiredError(
                    f"MIN Meeting Date ({meeting_date}) is later than Target Date ({ecn.target_date}). "
                    "A Delay Reason is mandatory.",
                    field="delay_reason",
                )
            ecn.delay_reason = clean_delay_reason

        # Synchronize ECN completion
        ecn.min_meeting_date = meeting_date
        ecn.completion_date = meeting_date
        ecn.ecn_status = ECN_STATUS_COMPLETED

        user = created_by or DEFAULT_USER
        min_record = MINMeeting(
            ecn_id=ecn_id,
            meeting_date=meeting_date,
            remarks=(remarks or "").strip() if remarks else None,
            created_by=user,
            modified_by=user,
        )
        self.session.add(min_record)
        self.session.flush()
        return min_record

    def get_min_for_ecn(self, ecn_id: int) -> Optional[MINMeeting]:
        """Retrieve MIN record for an ECN, if one exists."""
        stmt = select(MINMeeting).where(MINMeeting.ecn_id == ecn_id)
        return self.session.execute(stmt).scalar_one_or_none()

    def list_all_mins(self) -> List[MINMeeting]:
        """List all MIN meeting records."""
        stmt = select(MINMeeting).order_by(MINMeeting.meeting_date.desc())
        return list(self.session.execute(stmt).scalars().all())
