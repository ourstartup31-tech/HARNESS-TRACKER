"""Engineer service for managing engineering personnel records."""
from typing import List, Optional
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.engineering_tracker.models.engineer import Engineer
from app.engineering_tracker.services.exceptions import (
    BusinessValidationError,
    DuplicateEntityError,
    EntityNotFoundError,
)
from app.engineering_tracker.config import DEFAULT_USER


class EngineerService:
    """Service handling Engineer Master operations and validations."""

    def __init__(self, session: Session):
        self.session = session

    def create_engineer(
        self, name: str, created_by: Optional[str] = None
    ) -> Engineer:
        """Create a new engineer. Prevent duplicate names."""
        clean_name = (name or "").strip()
        if not clean_name:
            raise BusinessValidationError("Engineer name must be provided.", field="name")

        stmt = select(Engineer).where(func.lower(Engineer.name) == clean_name.lower())
        existing = self.session.execute(stmt).scalar_one_or_none()
        if existing:
            raise DuplicateEntityError(
                f"An engineer with name '{clean_name}' already exists.", field="name"
            )

        user = created_by or DEFAULT_USER
        engineer = Engineer(name=clean_name, is_active=True, created_by=user, modified_by=user)
        self.session.add(engineer)
        self.session.flush()
        return engineer

    def set_active_status(
        self, engineer_id: int, is_active: bool, modified_by: Optional[str] = None
    ) -> Engineer:
        """Activate or deactivate an engineer without deleting historical assignments."""
        engineer = self.get_engineer_by_id(engineer_id)
        engineer.is_active = is_active
        engineer.modified_by = modified_by or DEFAULT_USER
        self.session.flush()
        return engineer

    def get_engineer_by_id(self, engineer_id: int) -> Engineer:
        """Retrieve engineer by ID or raise EntityNotFoundError."""
        engineer = self.session.get(Engineer, engineer_id)
        if not engineer:
            raise EntityNotFoundError(f"Engineer with ID {engineer_id} does not exist.")
        return engineer

    def list_engineers(self, active_only: bool = False) -> List[Engineer]:
        """List engineers, optionally filtering to active only."""
        stmt = select(Engineer).order_by(Engineer.name.asc())
        if active_only:
            stmt = stmt.where(Engineer.is_active.is_(True))
        return list(self.session.execute(stmt).scalars().all())
