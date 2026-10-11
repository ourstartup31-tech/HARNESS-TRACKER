"""MIN Meeting model."""
from datetime import date
from typing import Optional, TYPE_CHECKING
from sqlalchemy import Date, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.engineering_tracker.database.base import Base
from app.engineering_tracker.models.audit import AuditMixin

if TYPE_CHECKING:
    from app.engineering_tracker.models.ecn import ECN


class MINMeeting(Base, AuditMixin):
    """MIN Meeting entity representing the final engineering completion milestone."""

    __tablename__ = "min_meetings"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ecn_id: Mapped[int] = mapped_column(
        ForeignKey("ecns.id", ondelete="RESTRICT"), unique=True, nullable=False, index=True
    )
    meeting_date: Mapped[date] = mapped_column(Date, nullable=False)
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    ecn: Mapped["ECN"] = relationship("ECN", back_populates="min_meeting")

    def __repr__(self) -> str:
        return f"<MINMeeting(id={self.id}, ecn_id={self.ecn_id}, date={self.meeting_date})>"
