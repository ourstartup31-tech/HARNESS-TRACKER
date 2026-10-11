"""ECN model."""
from datetime import date
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import Boolean, Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.engineering_tracker.database.base import Base
from app.engineering_tracker.models.audit import AuditMixin
from app.engineering_tracker.config import (
    STAGE_CONTEXT_SAMPLE,
    DEV_TYPE_NEW,
    REVISION_IMPACT_SAME,
    ECN_STATUS_IN_PROGRESS,
)

if TYPE_CHECKING:
    from app.engineering_tracker.models.harness import Harness
    from app.engineering_tracker.models.revision import Revision
    from app.engineering_tracker.models.engineer import Engineer
    from app.engineering_tracker.models.rfq import RFQ
    from app.engineering_tracker.models.bom import BOMRecord
    from app.engineering_tracker.models.min_meeting import MINMeeting
    from app.engineering_tracker.models.kit import ConsolidatedKit


class ECN(Base, AuditMixin):
    """ECN entity representing an engineering change order."""

    __tablename__ = "ecns"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ecn_number: Mapped[str] = mapped_column(
        String(50), unique=True, index=True, nullable=False
    )
    harness_id: Mapped[int] = mapped_column(
        ForeignKey("harnesses.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    source_revision_id: Mapped[int] = mapped_column(
        ForeignKey("revisions.id", ondelete="RESTRICT"), nullable=False, index=True
    )

    # Classification
    stage_context: Mapped[str] = mapped_column(
        String(50), default=STAGE_CONTEXT_SAMPLE, nullable=False
    )
    development_type: Mapped[str] = mapped_column(
        String(50), default=DEV_TYPE_NEW, nullable=False
    )

    # Change Details
    change_reason: Mapped[str] = mapped_column(Text, nullable=False)
    revision_impact: Mapped[str] = mapped_column(
        String(50), default=REVISION_IMPACT_SAME, nullable=False
    )
    new_revision_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("revisions.id", ondelete="RESTRICT"), nullable=True
    )

    # Costing linkage
    costing_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    rfq_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("rfqs.id", ondelete="RESTRICT"), nullable=True, index=True
    )

    # Engineers
    primary_engineer_id: Mapped[int] = mapped_column(
        ForeignKey("engineers.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    support_engineer_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("engineers.id", ondelete="RESTRICT"), nullable=True
    )

    # Dates
    design_input_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    work_start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    target_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    min_meeting_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    completion_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # Status and delay
    ecn_status: Mapped[str] = mapped_column(
        String(50), default=ECN_STATUS_IN_PROGRESS, nullable=False
    )
    delay_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    harness: Mapped["Harness"] = relationship("Harness", back_populates="ecns")
    source_revision: Mapped["Revision"] = relationship(
        "Revision", foreign_keys=[source_revision_id], back_populates="source_ecns"
    )
    new_revision: Mapped[Optional["Revision"]] = relationship(
        "Revision", foreign_keys=[new_revision_id], back_populates="new_ecns"
    )
    primary_engineer: Mapped["Engineer"] = relationship(
        "Engineer", foreign_keys=[primary_engineer_id]
    )
    support_engineer: Mapped[Optional["Engineer"]] = relationship(
        "Engineer", foreign_keys=[support_engineer_id]
    )
    related_rfq: Mapped[Optional["RFQ"]] = relationship("RFQ", back_populates="ecns")
    boms: Mapped[List["BOMRecord"]] = relationship(
        "BOMRecord", back_populates="ecn", cascade="all, delete-orphan"
    )
    min_meeting: Mapped[Optional["MINMeeting"]] = relationship(
        "MINMeeting", back_populates="ecn", uselist=False, cascade="all, delete-orphan"
    )
    kit_entry: Mapped[Optional["ConsolidatedKit"]] = relationship(
        "ConsolidatedKit", back_populates="ecn", uselist=False, cascade="all, delete-orphan"
    )

    @property
    def planned_duration(self) -> Optional[int]:
        """Planned duration in calendar days: Target Date - Work Start Date."""
        if self.target_date and self.work_start_date:
            return (self.target_date - self.work_start_date).days
        return None

    @property
    def actual_duration(self) -> Optional[int]:
        """Actual duration in calendar days: MIN Meeting Date - Work Start Date."""
        if self.min_meeting_date and self.work_start_date:
            return (self.min_meeting_date - self.work_start_date).days
        return None

    @property
    def delay_days(self) -> int:
        """Delay in calendar days: max(0, MIN Meeting Date - Target Date)."""
        if self.min_meeting_date and self.target_date:
            diff = (self.min_meeting_date - self.target_date).days
            return max(0, diff)
        return 0

    def __repr__(self) -> str:
        return f"<ECN(id={self.id}, number='{self.ecn_number}', status='{self.ecn_status}')>"
