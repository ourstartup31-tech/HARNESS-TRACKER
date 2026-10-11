"""Project service for managing Customer + Model combinations."""
from typing import List, Optional
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.engineering_tracker.models.project import Project
from app.engineering_tracker.models.customer import Customer
from app.engineering_tracker.services.exceptions import (
    BusinessValidationError,
    DuplicateEntityError,
    EntityNotFoundError,
)
from app.engineering_tracker.config import DEFAULT_USER


class ProjectService:
    """Service handling Project context operations and validations."""

    def __init__(self, session: Session):
        self.session = session

    def get_or_create_project(
        self, customer_id: int, model_name: str, created_by: Optional[str] = None
    ) -> Project:
        """Get existing project or create a new one under customer. Ensures customer exists."""
        clean_model = (model_name or "").strip()
        if not clean_model:
            raise BusinessValidationError("Model name must be provided.", field="model_name")

        customer = self.session.get(Customer, customer_id)
        if not customer:
            raise EntityNotFoundError(f"Customer with ID {customer_id} does not exist.")

        # Search existing project under this customer (case-insensitive)
        stmt = (
            select(Project)
            .where(Project.customer_id == customer_id)
            .where(func.lower(Project.model_name) == clean_model.lower())
        )
        existing = self.session.execute(stmt).scalar_one_or_none()
        if existing:
            return existing

        user = created_by or DEFAULT_USER
        project = Project(
            customer_id=customer_id,
            model_name=clean_model,
            created_by=user,
            modified_by=user,
        )
        self.session.add(project)
        self.session.flush()
        return project

    def get_project_by_id(self, project_id: int) -> Project:
        """Retrieve project by ID or raise EntityNotFoundError."""
        project = self.session.get(Project, project_id)
        if not project:
            raise EntityNotFoundError(f"Project with ID {project_id} does not exist.")
        return project

    def list_projects_for_customer(self, customer_id: int) -> List[Project]:
        """List all projects associated with a given customer."""
        stmt = (
            select(Project)
            .where(Project.customer_id == customer_id)
            .order_by(Project.model_name.asc())
        )
        return list(self.session.execute(stmt).scalars().all())

    def list_all_projects(self) -> List[Project]:
        """List all projects across all customers."""
        stmt = select(Project).order_by(Project.model_name.asc())
        return list(self.session.execute(stmt).scalars().all())
