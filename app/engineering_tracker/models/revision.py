"""Revision model."""
from typing import List, TYPE_CHECKING
from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.engineering_tracker.database.base import Base
from app.engineering_tracker.models.audit import AuditMixin
from app.engineering_tracker.config import ACTIVE_STATUS

if TYPE_CHECKING:
    from app.engineering_tracker.models.harness import Harness
    from app.engineering_tracker.models.rfq import RFQ
    from app.engineering_tracker.models.ecn import ECN


class Revision(Base, AuditMixin):
    """Revision entity representing an engineering revision of a Harness."""

    __tablename__ = "revisions"
    __table_args__ = (
        UniqueConstraint("harness_id", "revision_code", name="uq_revisions_harness_revision"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    harness_id: Mapped[int] = mapped_column(
        ForeignKey("harnesses.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    revision_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    sop_number: Mapped[str] = mapped_column(String(100), nullable=False)
    volume: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    circuit_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default=ACTIVE_STATUS, nullable=False)

    # Relationships
    harness: Mapped["Harness"] = relationship("Harness", back_populates="revisions")
    rfqs: Mapped[List["RFQ"]] = relationship("RFQ", back_populates="revision")
    source_ecns: Mapped[List["ECN"]] = relationship(
        "ECN", foreign_keys="ECN.source_revision_id", back_populates="source_revision"
    )
    new_ecns: Mapped[List["ECN"]] = relationship(
        "ECN", foreign_keys="ECN.new_revision_id", back_populates="new_revision"
    )

    def __repr__(self) -> str:
        return f"<Revision(id={self.id}, harness_id={self.harness_id}, code='{self.revision_code}', status='{self.status}')>"
