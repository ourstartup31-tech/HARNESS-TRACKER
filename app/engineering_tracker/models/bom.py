"""BOM Upload and Release model."""
from datetime import date
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import Date, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.engineering_tracker.database.base import Base
from app.engineering_tracker.models.audit import AuditMixin
from app.engineering_tracker.config import (
    BOM_STATUS_PENDING_UPLOAD,
    BOM_STATUS_UPLOADED,
    BOM_STATUS_RELEASED,
    LABEL_STATUS_NOT_UPLOADED,
    LABEL_STATUS_UPLOADED,
)

if TYPE_CHECKING:
    from app.engineering_tracker.models.ecn import ECN
    from app.engineering_tracker.models.engineer import Engineer
    from app.engineering_tracker.models.label_upload import LabelUpload


class BOMRecord(Base, AuditMixin):
    """BOM Record entity representing SAP BOM upload and release milestones."""

    __tablename__ = "bom_records"
    __table_args__ = (
        UniqueConstraint("fg_code", "bom_alternate", name="uq_bom_fg_alternate"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    fg_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    bom_alternate: Mapped[str] = mapped_column(String(20), nullable=False, index=True)

    # Customer and internal part information
    customer_part_number: Mapped[str] = mapped_column(String(100), nullable=False)
    customer_revision: Mapped[str] = mapped_column(String(50), nullable=False)
    fg_revision: Mapped[str] = mapped_column(String(50), nullable=False)

    # Linkage to ECN
    ecn_id: Mapped[int] = mapped_column(
        ForeignKey("ecns.id", ondelete="RESTRICT"), nullable=False, index=True
    )

    # Upload and Release events
    uploaded_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("engineers.id", ondelete="RESTRICT"), nullable=True
    )
    upload_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    release_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # Relationships
    ecn: Mapped["ECN"] = relationship("ECN", back_populates="boms")
    uploaded_by: Mapped[Optional["Engineer"]] = relationship(
        "Engineer", foreign_keys=[uploaded_by_id]
    )
    labels: Mapped[List["LabelUpload"]] = relationship(
        "LabelUpload", back_populates="bom", cascade="all, delete-orphan"
    )

    @property
    def bom_status(self) -> str:
        """Derived event-driven status: Pending Upload, Uploaded, Released."""
        if self.release_date is not None:
            return BOM_STATUS_RELEASED
        if self.upload_date is not None:
            return BOM_STATUS_UPLOADED
        return BOM_STATUS_PENDING_UPLOAD

    @property
    def label_status(self) -> str:
        """Derived label status: Uploaded if any label exists, otherwise Not Uploaded."""
        return LABEL_STATUS_UPLOADED if len(self.labels) > 0 else LABEL_STATUS_NOT_UPLOADED

    def __repr__(self) -> str:
        return f"<BOMRecord(id={self.id}, fg='{self.fg_code}', alt='{self.bom_alternate}', status='{self.bom_status}')>"
