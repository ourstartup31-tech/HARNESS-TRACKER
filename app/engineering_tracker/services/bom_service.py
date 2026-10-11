"""BOM service for managing SAP BOM upload and release milestones."""
from datetime import date
from typing import List, Optional
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.engineering_tracker.models.bom import BOMRecord
from app.engineering_tracker.models.ecn import ECN
from app.engineering_tracker.models.engineer import Engineer
from app.engineering_tracker.services.exceptions import (
    BusinessValidationError,
    DuplicateEntityError,
    InvalidAlternateSequenceError,
    EntityNotFoundError,
)
from app.engineering_tracker.config import DEFAULT_USER


class BOMService:
    """Service handling BOM uploads, sequential alternate validation, and release milestones."""

    def __init__(self, session: Session):
        self.session = session

    def get_next_alternate_for_fg(self, fg_code: str) -> str:
        """Compute the next expected sequential alternate for an FG Code (01, 02, 03...)."""
        clean_fg = (fg_code or "").strip()
        stmt = select(BOMRecord.bom_alternate).where(
            func.lower(BOMRecord.fg_code) == clean_fg.lower()
        )
        existing_alts = self.session.execute(stmt).scalars().all()

        max_seq = 0
        for alt in existing_alts:
            try:
                seq = int(alt)
                if seq > max_seq:
                    max_seq = seq
            except ValueError:
                continue

        return f"{max_seq + 1:02d}"

    def upload_bom(
        self,
        ecn_id: int,
        fg_code: str,
        customer_part_number: str,
        customer_revision: str,
        fg_revision: str,
        uploaded_by_id: int,
        bom_alternate: Optional[str] = None,
        upload_date: Optional[date] = None,
        release_date: Optional[date] = None,
        created_by: Optional[str] = None,
    ) -> BOMRecord:
        """
        Record an SAP BOM upload.
        Validates:
        - ECN exists.
        - FG Code provided.
        - Alternate is valid and sequential per FG Code.
        - No duplicate (fg_code, bom_alternate).
        - Upload date is recorded (no placeholder alternates).
        """
        ecn = self.session.get(ECN, ecn_id)
        if not ecn:
            raise EntityNotFoundError(f"ECN with ID {ecn_id} does not exist.")

        clean_fg = (fg_code or "").strip()
        clean_cpn = (customer_part_number or "").strip()
        clean_crev = (customer_revision or "").strip()
        clean_fgrev = (fg_revision or "").strip()

        if not clean_fg:
            raise BusinessValidationError("FG Code must be provided.", field="fg_code")
        if not clean_cpn:
            raise BusinessValidationError("Customer Part Number must be provided.", field="customer_part_number")
        if not clean_crev:
            raise BusinessValidationError("Customer Revision must be provided.", field="customer_revision")
        if not clean_fgrev:
            raise BusinessValidationError("FG Revision must be provided.", field="fg_revision")

        uploader = self.session.get(Engineer, uploaded_by_id)
        if not uploader:
            raise EntityNotFoundError(f"Uploader engineer with ID {uploaded_by_id} does not exist.")

        # Determine expected alternate
        expected_alt = self.get_next_alternate_for_fg(clean_fg)
        alt_to_use = (bom_alternate or "").strip() if bom_alternate else expected_alt

        # Check duplicate
        stmt = (
            select(BOMRecord)
            .where(func.lower(BOMRecord.fg_code) == clean_fg.lower())
            .where(BOMRecord.bom_alternate == alt_to_use)
        )
        existing = self.session.execute(stmt).scalar_one_or_none()
        if existing:
            raise DuplicateEntityError(
                f"BOM alternate '{alt_to_use}' already exists for FG Code '{clean_fg}'.",
                field="bom_alternate",
            )

        # Enforce sequential alternate validation
        if alt_to_use != expected_alt:
            raise InvalidAlternateSequenceError(
                f"Invalid BOM alternate '{alt_to_use}' for FG Code '{clean_fg}'. "
                f"The next expected sequential alternate is '{expected_alt}'.",
                field="bom_alternate",
            )

        actual_upload_date = upload_date or date.today()
        user = created_by or DEFAULT_USER

        bom = BOMRecord(
            ecn_id=ecn_id,
            fg_code=clean_fg,
            bom_alternate=alt_to_use,
            customer_part_number=clean_cpn,
            customer_revision=clean_crev,
            fg_revision=clean_fgrev,
            uploaded_by_id=uploaded_by_id,
            upload_date=actual_upload_date,
            release_date=release_date,
            created_by=user,
            modified_by=user,
        )
        self.session.add(bom)
        self.session.flush()
        return bom

    def release_bom(
        self, bom_id: int, release_date: date, modified_by: Optional[str] = None
    ) -> BOMRecord:
        """Release a BOM by recording its release date."""
        bom = self.get_bom_by_id(bom_id)
        if not release_date:
            raise BusinessValidationError("Release Date must be provided to release a BOM.", field="release_date")

        if bom.upload_date and release_date < bom.upload_date:
            raise BusinessValidationError("Release Date cannot be earlier than Upload Date.")

        bom.release_date = release_date
        bom.modified_by = modified_by or DEFAULT_USER
        self.session.flush()
        return bom

    def get_bom_by_id(self, bom_id: int) -> BOMRecord:
        """Retrieve BOM record by ID or raise EntityNotFoundError."""
        bom = self.session.get(BOMRecord, bom_id)
        if not bom:
            raise EntityNotFoundError(f"BOM record with ID {bom_id} does not exist.")
        return bom

    def list_boms_for_ecn(self, ecn_id: int) -> List[BOMRecord]:
        """List all BOM records associated with an ECN."""
        stmt = select(BOMRecord).where(BOMRecord.ecn_id == ecn_id).order_by(BOMRecord.id.asc())
        return list(self.session.execute(stmt).scalars().all())

    def list_all_boms(self) -> List[BOMRecord]:
        """List all BOM records ordered by ID descending."""
        stmt = select(BOMRecord).order_by(BOMRecord.id.desc())
        return list(self.session.execute(stmt).scalars().all())
