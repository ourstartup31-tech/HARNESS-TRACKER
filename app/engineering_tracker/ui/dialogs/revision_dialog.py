"""Revision management dialog."""
from PySide6.QtWidgets import (
    QDialog,
    QVBoxLayout,
    QFormLayout,
    QLineEdit,
    QComboBox,
    QSpinBox,
    QDialogButtonBox,
    QMessageBox,
)
from sqlalchemy.orm import Session
from app.engineering_tracker.services.revision_service import RevisionService
from app.engineering_tracker.services.harness_service import HarnessService
from app.engineering_tracker.services.exceptions import (
    BusinessValidationError,
    ActiveRevisionConflictError,
)
from app.engineering_tracker.config import (
    ACTIVE_STATUS,
    OBSOLETE_STATUS,
    REVISION_STATUSES,
)


class RevisionDialog(QDialog):
    """Dialog for creating a new Revision for a Harness."""

    def __init__(self, session: Session, harness_id: int, parent=None):
        super().__init__(parent)
        self.session = session
        self.harness_id = harness_id
        self.revision_svc = RevisionService(session)
        self.harness = HarnessService(session).get_harness_by_id(harness_id)

        self.setWindowTitle(f"Add Revision — Harness {self.harness.harness_number}")
        self.setMinimumWidth(420)

        layout = QVBoxLayout(self)
        form = QFormLayout()

        self.rev_input = QLineEdit()
        self.rev_input.setPlaceholderText("e.g. B, 02")
        form.addRow("Revision Code *:", self.rev_input)

        self.sop_input = QLineEdit()
        self.sop_input.setPlaceholderText("e.g. SOP-002")
        form.addRow("SOP Number *:", self.sop_input)

        self.volume_spin = QSpinBox()
        self.volume_spin.setRange(0, 10000000)
        self.volume_spin.setValue(5000)
        form.addRow("Planned Volume:", self.volume_spin)

        self.circuits_spin = QSpinBox()
        self.circuits_spin.setRange(0, 5000)
        self.circuits_spin.setValue(20)
        form.addRow("Number of Circuits:", self.circuits_spin)

        self.status_combo = QComboBox()
        self.status_combo.addItems(REVISION_STATUSES)
        # Default to Obsolete or Active depending on whether active rev exists
        active_rev = self.revision_svc.get_active_revision_for_harness(harness_id)
        if active_rev:
            self.status_combo.setCurrentText(OBSOLETE_STATUS)
        else:
            self.status_combo.setCurrentText(ACTIVE_STATUS)
        form.addRow("Status:", self.status_combo)

        layout.addLayout(form)

        button_box = QDialogButtonBox(
            QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel
        )
        button_box.accepted.connect(self._save)
        button_box.rejected.connect(self.reject)
        layout.addWidget(button_box)

    def _save(self) -> None:
        rev_code = self.rev_input.text().strip()
        sop_num = self.sop_input.text().strip()
        status = self.status_combo.currentText()

        try:
            self.revision_svc.create_revision(
                harness_id=self.harness_id,
                revision_code=rev_code,
                sop_number=sop_num,
                volume=self.volume_spin.value(),
                circuit_count=self.circuits_spin.value(),
                status=status,
            )
            self.session.commit()
            self.accept()
        except ActiveRevisionConflictError as e:
            self.session.rollback()
            QMessageBox.critical(
                self,
                "Poka-Yoke: Active Revision Conflict",
                e.message,
            )
        except BusinessValidationError as e:
            self.session.rollback()
            QMessageBox.warning(self, "Validation Error", e.message)
        except Exception as e:
            self.session.rollback()
            QMessageBox.critical(self, "Error", f"Failed to add revision:\n{e}")
