"""Label Upload model."""
from datetime import date
from typing import TYPE_CHECKING
from sqlalchemy import Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.engineering_tracker.database.base import Base
from app.engineering_tracker.models.audit import AuditMixin

if TYPE_CHECKING:
    from app.engineering_tracker.models.bom import BOMRecord
    from app.engineering_tracker.models.engineer import Engineer


class LabelUpload(Base, AuditMixin):
    """Label Upload entity representing historical label upload events per BOM."""

    __tablename__ = "label_uploads"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    bom_id: Mapped[int] = mapped_column(
        ForeignKey("bom_records.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    fg_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    bom_alternate: Mapped[str] = mapped_column(String(20), nullable=False, index=True)

    uploaded_by_id: Mapped[int] = mapped_column(
        ForeignKey("engineers.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    upload_date: Mapped[date] = mapped_column(Date, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)

    # Relationships
    bom: Mapped["BOMRecord"] = relationship("BOMRecord", back_populates="labels")
    uploaded_by: Mapped["Engineer"] = relationship(
        "Engineer", foreign_keys=[uploaded_by_id]
    )

    def __repr__(self) -> str:
        return f"<LabelUpload(id={self.id}, bom_id={self.bom_id}, date={self.upload_date})>"
