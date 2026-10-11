"""Revision service for managing Harness revisions and Poka-Yoke single-active constraint."""
from typing import List, Optional
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.engineering_tracker.models.revision import Revision
from app.engineering_tracker.models.harness import Harness
from app.engineering_tracker.services.exceptions import (
    BusinessValidationError,
    DuplicateEntityError,
    ActiveRevisionConflictError,
    EntityNotFoundError,
)
from app.engineering_tracker.config import (
    ACTIVE_STATUS,
    OBSOLETE_STATUS,
    REVISION_STATUSES,
    DEFAULT_USER,
)


class RevisionService:
    """Service handling Revision operations and strict single-active revision enforcement."""

    def __init__(self, session: Session):
        self.session = session

    def create_revision(
        self,
        harness_id: int,
        revision_code: str,
        sop_number: str,
        volume: int,
        circuit_count: int,
        status: str = ACTIVE_STATUS,
        created_by: Optional[str] = None,
    ) -> Revision:
        """
        Create a new revision for a harness.
        Poka-Yoke:
        - Rejects duplicate (harness_id, revision_code).
        - Blocks creation with status='Active' if another revision for the harness is currently 'Active'.
        """
        clean_code = (revision_code or "").strip()
        clean_sop = (sop_number or "").strip()

        if not clean_code:
            raise BusinessValidationError("Revision code must be provided.", field="revision_code")
        if not clean_sop:
            raise BusinessValidationError("SOP Number must be provided.", field="sop_number")
        if volume < 0:
            raise BusinessValidationError("Volume cannot be negative.", field="volume")
        if circuit_count < 0:
            raise BusinessValidationError("Number of circuits cannot be negative.", field="circuit_count")
        if status not in REVISION_STATUSES:
            raise BusinessValidationError(
                f"Invalid status '{status}'. Must be one of {REVISION_STATUSES}.", field="status"
            )

        harness = self.session.get(Harness, harness_id)
        if not harness:
            raise EntityNotFoundError(f"Harness with ID {harness_id} does not exist.")

        # Check duplicate revision code for this harness
        stmt = (
            select(Revision)
            .where(Revision.harness_id == harness_id)
            .where(func.lower(Revision.revision_code) == clean_code.lower())
        )
        existing = self.session.execute(stmt).scalar_one_or_none()
        if existing:
            raise DuplicateEntityError(
                f"Revision '{clean_code}' already exists for Harness '{harness.harness_number}'.",
                field="revision_code",
            )

        # Check single-active constraint
        if status == ACTIVE_STATUS:
            active_rev = self.get_active_revision_for_harness(harness_id)
            if active_rev:
                raise ActiveRevisionConflictError(
                    f"Cannot activate Revision '{clean_code}' because Revision '{active_rev.revision_code}' "
                    f"is still Active for Harness '{harness.harness_number}'. "
                    f"Manually mark Revision '{active_rev.revision_code}' as Obsolete before activating Revision '{clean_code}'."
                )

        user = created_by or DEFAULT_USER
        rev = Revision(
            harness_id=harness_id,
            revision_code=clean_code,
            sop_number=clean_sop,
            volume=volume,
            circuit_count=circuit_count,
            status=status,
            created_by=user,
            modified_by=user,
        )
        self.session.add(rev)
        self.session.flush()
        return rev

    def set_revision_status(
        self, revision_id: int, new_status: str, modified_by: Optional[str] = None
    ) -> Revision:
        """
        Update revision status to Active or Obsolete.
        If setting to Active, ensure no other revision is currently Active for this harness.
        """
        if new_status not in REVISION_STATUSES:
            raise BusinessValidationError(
                f"Invalid status '{new_status}'. Must be one of {REVISION_STATUSES}."
            )

        rev = self.get_revision_by_id(revision_id)
        if rev.status == new_status:
            return rev

        if new_status == ACTIVE_STATUS:
            active_rev = self.get_active_revision_for_harness(rev.harness_id)
            if active_rev and active_rev.id != rev.id:
                raise ActiveRevisionConflictError(
                    f"Cannot activate Revision '{rev.revision_code}' because Revision '{active_rev.revision_code}' "
                    f"is still Active for Harness '{rev.harness.harness_number}'. "
                    f"Manually mark Revision '{active_rev.revision_code}' as Obsolete before activating Revision '{rev.revision_code}'."
                )

        rev.status = new_status
        rev.modified_by = modified_by or DEFAULT_USER
        self.session.flush()
        return rev

    def get_revision_by_id(self, revision_id: int) -> Revision:
        """Retrieve revision by ID or raise EntityNotFoundError."""
        rev = self.session.get(Revision, revision_id)
        if not rev:
            raise EntityNotFoundError(f"Revision with ID {revision_id} does not exist.")
        return rev

    def get_active_revision_for_harness(self, harness_id: int) -> Optional[Revision]:
        """Find the currently active revision for a harness, if one exists."""
        stmt = (
            select(Revision)
            .where(Revision.harness_id == harness_id)
            .where(Revision.status == ACTIVE_STATUS)
        )
        return self.session.execute(stmt).scalar_one_or_none()

    def list_revisions_for_harness(self, harness_id: int) -> List[Revision]:
        """List all revisions for a harness in order of creation/ID."""
        stmt = (
            select(Revision)
            .where(Revision.harness_id == harness_id)
            .order_by(Revision.id.asc())
        )
        return list(self.session.execute(stmt).scalars().all())
