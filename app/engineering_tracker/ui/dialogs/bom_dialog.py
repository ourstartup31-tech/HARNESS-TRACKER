"""BOM Upload and Release dialogs."""
from datetime import date
from typing import Optional
from PySide6.QtWidgets import (
    QDialog,
    QVBoxLayout,
    QFormLayout,
    QComboBox,
    QLineEdit,
    QDateEdit,
    QDialogButtonBox,
    QMessageBox,
)
from PySide6.QtCore import QDate
from sqlalchemy.orm import Session
from app.engineering_tracker.services.bom_service import BOMService
from app.engineering_tracker.services.ecn_service import ECNService
from app.engineering_tracker.services.engineer_service import EngineerService
from app.engineering_tracker.services.exceptions import (
    BusinessValidationError,
    InvalidAlternateSequenceError,
    DuplicateEntityError,
)


class BOMUploadDialog(QDialog):
    """Dialog for recording an SAP BOM upload."""

    def __init__(self, session: Session, default_ecn_id: Optional[int] = None, parent=None):
        super().__init__(parent)
        self.session = session
        self.bom_svc = BOMService(session)
        self.ecn_svc = ECNService(session)
        self.engineer_svc = EngineerService(session)

        self.setWindowTitle("Record SAP BOM Upload")
        self.setMinimumWidth(480)

        layout = QVBoxLayout(self)
        form = QFormLayout()

        # ECN
        self.ecn_combo = QComboBox()
        self.ecns = self.ecn_svc.list_all_ecns()
        for e in self.ecns:
            self.ecn_combo.addItem(f"{e.ecn_number} — Harness {e.harness.harness_number}", e.id)
        if default_ecn_id:
            idx = self.ecn_combo.findData(default_ecn_id)
            if idx >= 0:
                self.ecn_combo.setCurrentIndex(idx)
        form.addRow("Linked ECN *:", self.ecn_combo)

        # Internal FG Info
        self.fg_input = QLineEdit()
        self.fg_input.setPlaceholderText("Globally unique FG Code (e.g. FG-88001)")
        self.fg_input.textChanged.connect(self._on_fg_changed)
        form.addRow("FG Code *:", self.fg_input)

        self.alt_input = QLineEdit()
        self.alt_input.setPlaceholderText("Sequential alternate (e.g. 01, 02)")
        form.addRow("BOM Alternate *:", self.alt_input)

        self.fg_rev_input = QLineEdit()
        self.fg_rev_input.setPlaceholderText("Internal FG Revision (e.g. AA, BA)")
        form.addRow("FG Revision *:", self.fg_rev_input)

        # Customer Part Info
        self.cpn_input = QLineEdit()
        self.cpn_input.setPlaceholderText("Customer Part Number")
        form.addRow("Customer Part Number *:", self.cpn_input)

        self.crev_input = QLineEdit()
        self.crev_input.setPlaceholderText("Customer Revision (e.g. A, 01)")
        form.addRow("Customer Revision *:", self.crev_input)

        # Uploader & Date
        self.uploader_combo = QComboBox()
        self.engineers = self.engineer_svc.list_engineers(active_only=False)
        for eng in self.engineers:
            self.uploader_combo.addItem(eng.name, eng.id)
        form.addRow("Uploaded By *:", self.uploader_combo)

        self.upload_date_edit = QDateEdit(QDate.currentDate())
        self.upload_date_edit.setCalendarPopup(True)
        form.addRow("Upload Date *:", self.upload_date_edit)

        layout.addLayout(form)

        button_box = QDialogButtonBox(
            QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel
        )
        button_box.accepted.connect(self._save)
        button_box.rejected.connect(self.reject)
        layout.addWidget(button_box)

    def _on_fg_changed(self, text: str) -> None:
        clean_fg = text.strip()
        if clean_fg:
            next_alt = self.bom_svc.get_next_alternate_for_fg(clean_fg)
            self.alt_input.setPlaceholderText(f"Next expected: {next_alt}")
            if not self.alt_input.text():
                self.alt_input.setText(next_alt)

    def _save(self) -> None:
        ecn_id = self.ecn_combo.currentData()
        fg_code = self.fg_input.text().strip()
        bom_alt = self.alt_input.text().strip()
        cpn = self.cpn_input.text().strip()
        crev = self.crev_input.text().strip()
        fg_rev = self.fg_rev_input.text().strip()
        uploader_id = self.uploader_combo.currentData()
        qd = self.upload_date_edit.date()
        u_date = date(qd.year(), qd.month(), qd.day())

        try:
            self.bom_svc.upload_bom(
                ecn_id=ecn_id,
                fg_code=fg_code,
                customer_part_number=cpn,
                customer_revision=crev,
                fg_revision=fg_rev,
                uploaded_by_id=uploader_id,
                bom_alternate=bom_alt,
                upload_date=u_date,
            )
            self.session.commit()
            self.accept()
        except (InvalidAlternateSequenceError, DuplicateEntityError) as e:
            self.session.rollback()
            QMessageBox.critical(self, "Poka-Yoke: Alternate Validation Error", e.message)
        except BusinessValidationError as e:
            self.session.rollback()
            QMessageBox.warning(self, "Validation Error", e.message)
        except Exception as e:
            self.session.rollback()
            QMessageBox.critical(self, "Error", f"Failed to record BOM upload:\n{e}")


class BOMReleaseDialog(QDialog):
    """Dialog for releasing an uploaded BOM."""

    def __init__(self, session: Session, bom_id: int, parent=None):
        super().__init__(parent)
        self.session = session
        self.bom_id = bom_id
        self.bom_svc = BOMService(session)
        self.bom = self.bom_svc.get_bom_by_id(bom_id)

        self.setWindowTitle(f"Release SAP BOM — {self.bom.fg_code} Alt {self.bom.bom_alternate}")
        self.setMinimumWidth(380)

        layout = QVBoxLayout(self)
        form = QFormLayout()

        self.release_date_edit = QDateEdit(QDate.currentDate())
        self.release_date_edit.setCalendarPopup(True)
        form.addRow("Release Date *:", self.release_date_edit)

        layout.addLayout(form)

        button_box = QDialogButtonBox(
            QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel
        )
        button_box.accepted.connect(self._save)
        button_box.rejected.connect(self.reject)
        layout.addWidget(button_box)

    def _save(self) -> None:
        qd = self.release_date_edit.date()
        r_date = date(qd.year(), qd.month(), qd.day())
        try:
            self.bom_svc.release_bom(self.bom_id, release_date=r_date)
            self.session.commit()
            self.accept()
        except BusinessValidationError as e:
            self.session.rollback()
            QMessageBox.critical(self, "Validation Error", e.message)
        except Exception as e:
            self.session.rollback()
            QMessageBox.critical(self, "Error", f"Failed to release BOM:\n{e}")
