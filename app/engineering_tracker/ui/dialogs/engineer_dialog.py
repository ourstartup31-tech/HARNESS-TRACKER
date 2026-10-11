"""Engineer Master management dialog."""
from PySide6.QtWidgets import (
    QDialog,
    QVBoxLayout,
    QFormLayout,
    QLineEdit,
    QCheckBox,
    QDialogButtonBox,
    QMessageBox,
)
from sqlalchemy.orm import Session
from app.engineering_tracker.services.engineer_service import EngineerService
from app.engineering_tracker.services.exceptions import BusinessValidationError


class EngineerDialog(QDialog):
    """Dialog for creating or updating an Engineer."""

    def __init__(self, session: Session, engineer_id: int | None = None, parent=None):
        super().__init__(parent)
        self.session = session
        self.engineer_id = engineer_id
        self.engineer_svc = EngineerService(session)

        self.setWindowTitle("Edit Engineer" if engineer_id else "Add New Engineer")
        self.setMinimumWidth(380)

        layout = QVBoxLayout(self)
        form = QFormLayout()

        self.name_input = QLineEdit()
        self.name_input.setPlaceholderText("e.g. John Doe")
        form.addRow("Engineer Name *:", self.name_input)

        self.active_check = QCheckBox("Active for New Allocations")
        self.active_check.setChecked(True)
        if engineer_id:
            form.addRow("Status:", self.active_check)

        layout.addLayout(form)

        button_box = QDialogButtonBox(
            QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel
        )
        button_box.accepted.connect(self._save)
        button_box.rejected.connect(self.reject)
        layout.addWidget(button_box)

        if engineer_id:
            eng = self.engineer_svc.get_engineer_by_id(engineer_id)
            self.name_input.setText(eng.name)
            self.active_check.setChecked(eng.is_active)

    def _save(self) -> None:
        name = self.name_input.text().strip()
        try:
            if self.engineer_id:
                eng = self.engineer_svc.get_engineer_by_id(self.engineer_id)
                eng.name = name
                self.engineer_svc.set_active_status(
                    self.engineer_id, self.active_check.isChecked()
                )
            else:
                self.engineer_svc.create_engineer(name)
            self.session.commit()
            self.accept()
        except BusinessValidationError as e:
            QMessageBox.warning(self, "Validation Error", e.message)
        except Exception as e:
            QMessageBox.critical(self, "Error", f"Failed to save engineer:\n{e}")
