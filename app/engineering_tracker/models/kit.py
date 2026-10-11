"""Consolidated Active Kit Record model."""
from typing import Optional, TYPE_CHECKING
from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.engineering_tracker.database.base import Base
from app.engineering_tracker.models.audit import AuditMixin
from app.engineering_tracker.config import ACTIVE_STATUS

if TYPE_CHECKING:
    from app.engineering_tracker.models.ecn import ECN


class ConsolidatedKit(Base, AuditMixin):
    """Consolidated Kit entity storing hard-copy storage locations linked to completed ECNs."""

    __tablename__ = "consolidated_kits"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ecn_id: Mapped[int] = mapped_column(
        ForeignKey("ecns.id", ondelete="RESTRICT"), unique=True, nullable=False, index=True
    )

    # Kit-specific physical tracking fields
    rack_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    file_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    hard_copy_location: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default=ACTIVE_STATUS, nullable=False)

    # Relationship
    ecn: Mapped["ECN"] = relationship("ECN", back_populates="kit_entry")

    def __repr__(self) -> str:
        return f"<ConsolidatedKit(id={self.id}, ecn_id={self.ecn_id}, rack='{self.rack_number}', file='{self.file_number}')>"
