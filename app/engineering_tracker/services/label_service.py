"""Label upload service for managing label history and BOM release prerequisites."""
from datetime import date
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.engineering_tracker.models.label_upload import LabelUpload
from app.engineering_tracker.models.bom import BOMRecord
from app.engineering_tracker.models.engineer import Engineer
from app.engineering_tracker.services.exceptions import (
    BusinessValidationError,
    PrematureLabelUploadError,
    EntityNotFoundError,
)
from app.engineering_tracker.config import DEFAULT_USER


class LabelService:
    """Service handling Label uploads and release prerequisite validation."""

    def __init__(self, session: Session):
        self.session = session

    def upload_label(
        self,
        bom_id: int,
        uploaded_by_id: int,
        reason: str,
        upload_date: Optional[date] = None,
        created_by: Optional[str] = None,
    ) -> LabelUpload:
        """
        Record a label upload for a BOM.
        Enforces:
        - Target BOM must already be released (release_date is not None).
        - Reason is mandatory free text.
        - Multiple uploads are allowed and preserved as separate history records.
        """
        bom = self.session.get(BOMRecord, bom_id)
        if not bom:
            raise EntityNotFoundError(f"BOM record with ID {bom_id} does not exist.")

        # Check BOM release prerequisite
        if bom.release_date is None:
            raise PrematureLabelUploadError(
                f"Cannot upload label for BOM '{bom.fg_code}' Alternate '{bom.bom_alternate}' "
                "because the BOM has not been released yet. "
                "The BOM must be released before a label can be uploaded.",
                field="bom_id",
            )

        clean_reason = (reason or "").strip()
        if not clean_reason:
            raise BusinessValidationError("Reason is mandatory for every label upload.", field="reason")

        uploader = self.session.get(Engineer, uploaded_by_id)
        if not uploader:
            raise EntityNotFoundError(f"Engineer with ID {uploaded_by_id} does not exist.")

        actual_upload_date = upload_date or date.today()
        user = created_by or DEFAULT_USER

        label = LabelUpload(
            bom_id=bom_id,
            fg_code=bom.fg_code,
            bom_alternate=bom.bom_alternate,
            uploaded_by_id=uploaded_by_id,
            upload_date=actual_upload_date,
            reason=clean_reason,
            created_by=user,
            modified_by=user,
        )
        self.session.add(label)
        self.session.flush()
        return label

    def list_labels_for_bom(self, bom_id: int) -> List[LabelUpload]:
        """List all label uploads for a specific BOM ordered chronologically."""
        stmt = (
            select(LabelUpload)
            .where(LabelUpload.bom_id == bom_id)
            .order_by(LabelUpload.upload_date.desc(), LabelUpload.id.desc())
        )
        return list(self.session.execute(stmt).scalars().all())

    def list_all_labels(self) -> List[LabelUpload]:
        """List all label upload records."""
        stmt = select(LabelUpload).order_by(LabelUpload.id.desc())
        return list(self.session.execute(stmt).scalars().all())
