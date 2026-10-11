"""Harness model."""
from typing import List, TYPE_CHECKING
from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.engineering_tracker.database.base import Base
from app.engineering_tracker.models.audit import AuditMixin

if TYPE_CHECKING:
    from app.engineering_tracker.models.project import Project
    from app.engineering_tracker.models.revision import Revision
    from app.engineering_tracker.models.rfq import RFQ
    from app.engineering_tracker.models.ecn import ECN


class Harness(Base, AuditMixin):
    """Harness entity. Globally unique harness_number across the company."""

    __tablename__ = "harnesses"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    harness_number: Mapped[str] = mapped_column(
        String(100), unique=True, index=True, nullable=False
    )
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="RESTRICT"), nullable=False, index=True
    )

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="harnesses")
    revisions: Mapped[List["Revision"]] = relationship(
        "Revision", back_populates="harness", cascade="all, delete-orphan"
    )
    rfqs: Mapped[List["RFQ"]] = relationship("RFQ", back_populates="harness")
    ecns: Mapped[List["ECN"]] = relationship("ECN", back_populates="harness")

    def __repr__(self) -> str:
        return f"<Harness(id={self.id}, harness_number='{self.harness_number}', project_id={self.project_id})>"
