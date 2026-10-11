"""Label Upload and History viewer dialogs."""
from datetime import date
from PySide6.QtWidgets import (
    QDialog,
    QVBoxLayout,
    QFormLayout,
    QComboBox,
    QTextEdit,
    QDateEdit,
    QDialogButtonBox,
    QMessageBox,
    QTableWidget,
    QTableWidgetItem,
    QHeaderView,
    QLabel,
)
from PySide6.QtCore import QDate
from sqlalchemy.orm import Session
from app.engineering_tracker.services.label_service import LabelService
from app.engineering_tracker.services.bom_service import BOMService
from app.engineering_tracker.services.engineer_service import EngineerService
from app.engineering_tracker.services.exceptions import (
    BusinessValidationError,
    PrematureLabelUploadError,
)


class LabelUploadDialog(QDialog):
    """Dialog for recording a Label upload for a released BOM."""

    def __init__(self, session: Session, bom_id: int, parent=None):
        super().__init__(parent)
        self.session = session
        self.bom_id = bom_id
        self.label_svc = LabelService(session)
        self.bom_svc = BOMService(session)
        self.engineer_svc = EngineerService(session)
        self.bom = self.bom_svc.get_bom_by_id(bom_id)

        self.setWindowTitle(f"Upload Label — {self.bom.fg_code} Alt {self.bom.bom_alternate}")
        self.setMinimumWidth(440)

        layout = QVBoxLayout(self)
        form = QFormLayout()

        self.uploader_combo = QComboBox()
        self.engineers = self.engineer_svc.list_engineers(active_only=False)
        for eng in self.engineers:
            self.uploader_combo.addItem(eng.name, eng.id)
        form.addRow("Uploaded By *:", self.uploader_combo)

        self.upload_date_edit = QDateEdit(QDate.currentDate())
        self.upload_date_edit.setCalendarPopup(True)
        form.addRow("Upload Date *:", self.upload_date_edit)

        self.reason_input = QTextEdit()
        self.reason_input.setMaximumHeight(80)
        self.reason_input.setPlaceholderText("Reason for label upload (e.g. initial layout, revised barcode)...")
        form.addRow("Reason *:", self.reason_input)

        layout.addLayout(form)

        button_box = QDialogButtonBox(
            QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel
        )
        button_box.accepted.connect(self._save)
        button_box.rejected.connect(self.reject)
        layout.addWidget(button_box)

    def _save(self) -> None:
        uploader_id = self.uploader_combo.currentData()
        reason = self.reason_input.toPlainText().strip()
        qd = self.upload_date_edit.date()
        u_date = date(qd.year(), qd.month(), qd.day())

        try:
            self.label_svc.upload_label(
                bom_id=self.bom_id,
                uploaded_by_id=uploader_id,
                reason=reason,
                upload_date=u_date,
            )
            self.session.commit()
            self.accept()
        except PrematureLabelUploadError as e:
            self.session.rollback()
            QMessageBox.critical(self, "Poka-Yoke: BOM Not Released", e.message)
        except BusinessValidationError as e:
            self.session.rollback()
            QMessageBox.warning(self, "Validation Error", e.message)
        except Exception as e:
            self.session.rollback()
            QMessageBox.critical(self, "Error", f"Failed to upload label:\n{e}")


class LabelHistoryDialog(QDialog):
    """Dialog displaying the complete historical record of label uploads for a BOM."""

    def __init__(self, session: Session, bom_id: int, parent=None):
        super().__init__(parent)
        self.session = session
        self.bom_id = bom_id
        self.label_svc = LabelService(session)
        self.bom_svc = BOMService(session)
        self.bom = self.bom_svc.get_bom_by_id(bom_id)

        self.setWindowTitle(f"Label Upload History — {self.bom.fg_code} Alt {self.bom.bom_alternate}")
        self.setMinimumSize(600, 350)

        layout = QVBoxLayout(self)

        info_label = QLabel(
            f"<b>FG Code:</b> {self.bom.fg_code} | <b>Alternate:</b> {self.bom.bom_alternate} | "
            f"<b>BOM Status:</b> {self.bom.bom_status}"
        )
        layout.addWidget(info_label)

        table = QTableWidget()
        labels = self.label_svc.list_labels_for_bom(bom_id)
        table.setColumnCount(4)
        table.setHorizontalHeaderLabels(["Upload Date", "Uploaded By", "Reason", "Recorded Date"])
        table.horizontalHeader().setStretchLastSection(True)
        table.setRowCount(len(labels))

        for row, lbl in enumerate(labels):
            table.setItem(row, 0, QTableWidgetItem(str(lbl.upload_date)))
            table.setItem(row, 1, QTableWidgetItem(lbl.uploaded_by.name))
            table.setItem(row, 2, QTableWidgetItem(lbl.reason))
            table.setItem(row, 3, QTableWidgetItem(str(lbl.created_date.date() if lbl.created_date else "-")))

        layout.addWidget(table)

        btn_box = QDialogButtonBox(QDialogButtonBox.StandardButton.Close)
        btn_box.rejected.connect(self.accept)
        layout.addWidget(btn_box)
