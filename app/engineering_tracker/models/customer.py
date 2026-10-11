"""Customer master model."""
from typing import List, TYPE_CHECKING
from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.engineering_tracker.database.base import Base
from app.engineering_tracker.models.audit import AuditMixin

if TYPE_CHECKING:
    from app.engineering_tracker.models.project import Project


class Customer(Base, AuditMixin):
    """Customer entity representation."""

    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(150), unique=True, index=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    projects: Mapped[List["Project"]] = relationship(
        "Project", back_populates="customer", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Customer(id={self.id}, name='{self.name}', active={self.is_active})>"
