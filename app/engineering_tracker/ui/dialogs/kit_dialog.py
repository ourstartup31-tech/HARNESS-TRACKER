"""Consolidated Kit metadata editing dialog."""
from PySide6.QtWidgets import (
    QDialog,
    QVBoxLayout,
    QFormLayout,
    QLineEdit,
    QComboBox,
    QDialogButtonBox,
    QMessageBox,
    QLabel,
)
from sqlalchemy.orm import Session
from app.engineering_tracker.services.kit_service import KitService
from app.engineering_tracker.services.ecn_service import ECNService
from app.engineering_tracker.services.exceptions import (
    BusinessValidationError,
    MINPrerequisiteError,
)
from app.engineering_tracker.config import (
    ACTIVE_STATUS,
    REVISION_STATUSES,
)


class KitMetadataDialog(QDialog):
    """Dialog for editing physical storage metadata (Rack / File / Location) for a Kit entry."""

    def __init__(self, session: Session, ecn_id: int, parent=None):
        super().__init__(parent)
        self.session = session
        self.ecn_id = ecn_id
        self.kit_svc = KitService(session)
        self.ecn = ECNService(session).get_ecn_by_id(ecn_id)

        self.setWindowTitle(f"Edit Kit Storage Metadata — ECN {self.ecn.ecn_number}")
        self.setMinimumWidth(440)

        layout = QVBoxLayout(self)
        form = QFormLayout()

        info = QLabel(
            f"<b>Harness:</b> {self.ecn.harness.harness_number}<br>"
            f"<b>Customer/Model:</b> {self.ecn.harness.project.customer.name} - {self.ecn.harness.project.model_name}<br>"
            f"<b>MIN Date:</b> {self.ecn.min_meeting_date or 'None'}"
        )
        layout.addWidget(info)

        self.rack_input = QLineEdit()
        self.rack_input.setPlaceholderText("e.g. Rack-B-04")
        form.addRow("Rack Number:", self.rack_input)

        self.file_input = QLineEdit()
        self.file_input.setPlaceholderText("e.g. File-102")
        form.addRow("File Number:", self.file_input)

        self.location_input = QLineEdit()
        self.location_input.setPlaceholderText("e.g. Engineering Archive Room 2")
        form.addRow("Hard Copy Location:", self.location_input)

        self.status_combo = QComboBox()
        self.status_combo.addItems(REVISION_STATUSES)
        form.addRow("Kit Status:", self.status_combo)

        layout.addLayout(form)

        button_box = QDialogButtonBox(
            QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel
        )
        button_box.accepted.connect(self._save)
        button_box.rejected.connect(self.reject)
        layout.addWidget(button_box)

        # Load existing if available
        kit = self.kit_svc.get_kit_by_ecn_id(ecn_id)
        if kit:
            self.rack_input.setText(kit.rack_number or "")
            self.file_input.setText(kit.file_number or "")
            self.location_input.setText(kit.hard_copy_location or "")
            self.status_combo.setCurrentText(kit.status)

    def _save(self) -> None:
        rack = self.rack_input.text().strip()
        file_num = self.file_input.text().strip()
        location = self.location_input.text().strip()
        status = self.status_combo.currentText()

        try:
            self.kit_svc.create_or_update_kit_entry(
                ecn_id=self.ecn_id,
                rack_number=rack,
                file_number=file_num,
                hard_copy_location=location,
                status=status,
            )
            self.session.commit()
            self.accept()
        except MINPrerequisiteError as e:
            self.session.rollback()
            QMessageBox.critical(self, "Poka-Yoke: MIN Required", e.message)
        except BusinessValidationError as e:
            self.session.rollback()
            QMessageBox.warning(self, "Validation Error", e.message)
        except Exception as e:
            self.session.rollback()
            QMessageBox.critical(self, "Error", f"Failed to save kit entry:\n{e}")
