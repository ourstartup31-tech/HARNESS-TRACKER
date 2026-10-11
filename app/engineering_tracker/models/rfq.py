"""RFQ model."""
from datetime import date
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import Boolean, Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.engineering_tracker.database.base import Base
from app.engineering_tracker.models.audit import AuditMixin
from app.engineering_tracker.config import RFQ_STATUS_OPEN

if TYPE_CHECKING:
    from app.engineering_tracker.models.harness import Harness
    from app.engineering_tracker.models.revision import Revision
    from app.engineering_tracker.models.ecn import ECN


class RFQ(Base, AuditMixin):
    """RFQ entity representing commercial-to-engineering costing requests."""

    __tablename__ = "rfqs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    rfq_number: Mapped[str] = mapped_column(
        String(50), unique=True, index=True, nullable=False
    )
    harness_id: Mapped[int] = mapped_column(
        ForeignKey("harnesses.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    revision_id: Mapped[int] = mapped_column(
        ForeignKey("revisions.id", ondelete="RESTRICT"), nullable=False, index=True
    )

    # Milestones
    marketing_input_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    design_input_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    work_start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    target_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    completion_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    costing_bom_submitted_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # Query Management
    query_yes_no: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    query_submitted_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    reply_received_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    query_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    query_remark: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Proposal Management
    proposal_yes_no: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    proposal_submitted_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    proposal_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    proposal_remark: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Overall Status (manually controlled)
    overall_rfq_status: Mapped[str] = mapped_column(
        String(50), default=RFQ_STATUS_OPEN, nullable=False
    )

    # Relationships
    harness: Mapped["Harness"] = relationship("Harness", back_populates="rfqs")
    revision: Mapped["Revision"] = relationship("Revision", back_populates="rfqs")
    ecns: Mapped[List["ECN"]] = relationship("ECN", back_populates="related_rfq")

    def __repr__(self) -> str:
        return f"<RFQ(id={self.id}, number='{self.rfq_number}', status='{self.overall_rfq_status}')>"
