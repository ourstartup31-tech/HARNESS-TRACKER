"""Harness service for managing globally unique Harness records."""
from typing import List, Optional
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.engineering_tracker.models.harness import Harness
from app.engineering_tracker.models.project import Project
from app.engineering_tracker.services.exceptions import (
    BusinessValidationError,
    DuplicateEntityError,
    EntityNotFoundError,
)
from app.engineering_tracker.config import DEFAULT_USER


class HarnessService:
    """Service handling Harness entity operations and global uniqueness validation."""

    def __init__(self, session: Session):
        self.session = session

    def create_harness(
        self,
        project_id: int,
        harness_number: str,
        created_by: Optional[str] = None,
    ) -> Harness:
        """Create a new Harness under a Project. Enforce global uniqueness of harness_number."""
        clean_number = (harness_number or "").strip()
        if not clean_number:
            raise BusinessValidationError("Harness number must be provided.", field="harness_number")

        project = self.session.get(Project, project_id)
        if not project:
            raise EntityNotFoundError(f"Project with ID {project_id} does not exist.")

        # Check global uniqueness (case-insensitive)
        stmt = select(Harness).where(func.lower(Harness.harness_number) == clean_number.lower())
        existing = self.session.execute(stmt).scalar_one_or_none()
        if existing:
            raise DuplicateEntityError(
                f"Harness number '{clean_number}' already exists in the company under Project "
                f"'{existing.project.model_name}' (Customer: '{existing.project.customer.name}').",
                field="harness_number",
            )

        user = created_by or DEFAULT_USER
        harness = Harness(
            project_id=project_id,
            harness_number=clean_number,
            created_by=user,
            modified_by=user,
        )
        self.session.add(harness)
        self.session.flush()
        return harness

    def get_harness_by_id(self, harness_id: int) -> Harness:
        """Retrieve harness by ID or raise EntityNotFoundError."""
        harness = self.session.get(Harness, harness_id)
        if not harness:
            raise EntityNotFoundError(f"Harness with ID {harness_id} does not exist.")
        return harness

    def get_harness_by_number(self, harness_number: str) -> Optional[Harness]:
        """Look up harness by harness number (case-insensitive)."""
        clean_number = (harness_number or "").strip()
        stmt = select(Harness).where(func.lower(Harness.harness_number) == clean_number.lower())
        return self.session.execute(stmt).scalar_one_or_none()

    def list_harnesses_for_project(self, project_id: int) -> List[Harness]:
        """List all harnesses belonging to a project."""
        stmt = (
            select(Harness)
            .where(Harness.project_id == project_id)
            .order_by(Harness.harness_number.asc())
        )
        return list(self.session.execute(stmt).scalars().all())

    def list_all_harnesses(self) -> List[Harness]:
        """List all harnesses."""
        stmt = select(Harness).order_by(Harness.harness_number.asc())
        return list(self.session.execute(stmt).scalars().all())
