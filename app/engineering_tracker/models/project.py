"""Project / Model model."""
from typing import List, TYPE_CHECKING
from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.engineering_tracker.database.base import Base
from app.engineering_tracker.models.audit import AuditMixin

if TYPE_CHECKING:
    from app.engineering_tracker.models.customer import Customer
    from app.engineering_tracker.models.harness import Harness


class Project(Base, AuditMixin):
    """Project entity representing Customer + Model combination."""

    __tablename__ = "projects"
    __table_args__ = (
        UniqueConstraint("customer_id", "model_name", name="uq_projects_customer_model"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    customer_id: Mapped[int] = mapped_column(
        ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    model_name: Mapped[str] = mapped_column(String(120), nullable=False, index=True)

    # Relationships
    customer: Mapped["Customer"] = relationship("Customer", back_populates="projects")
    harnesses: Mapped[List["Harness"]] = relationship(
        "Harness", back_populates="project", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Project(id={self.id}, customer_id={self.customer_id}, model='{self.model_name}')>"
