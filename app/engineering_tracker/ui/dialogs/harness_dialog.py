"""Harness creation dialog."""
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
from app.engineering_tracker.services.customer_service import CustomerService
from app.engineering_tracker.services.project_service import ProjectService
from app.engineering_tracker.services.harness_service import HarnessService
from app.engineering_tracker.services.revision_service import RevisionService
from app.engineering_tracker.services.exceptions import BusinessValidationError
from app.engineering_tracker.config import ACTIVE_STATUS


class HarnessDialog(QDialog):
    """Dialog for creating a new globally unique Harness and initial Revision."""

    def __init__(self, session: Session, parent=None):
        super().__init__(parent)
        self.session = session
        self.customer_svc = CustomerService(session)
        self.project_svc = ProjectService(session)
        self.harness_svc = HarnessService(session)
        self.revision_svc = RevisionService(session)

        self.setWindowTitle("Register New Harness")
        self.setMinimumWidth(450)

        layout = QVBoxLayout(self)
        form = QFormLayout()

        # Customer selection
        self.customer_combo = QComboBox()
        self.customers = self.customer_svc.list_customers(active_only=True)
        for c in self.customers:
            self.customer_combo.addItem(c.name, c.id)
        form.addRow("Customer *:", self.customer_combo)

        # Model text input
        self.model_input = QLineEdit()
        self.model_input.setPlaceholderText("e.g. Scorpio-N, Brezza")
        form.addRow("Model / Project *:", self.model_input)

        # Harness Number
        self.harness_input = QLineEdit()
        self.harness_input.setPlaceholderText("Globally unique harness code (e.g. HARN-5501)")
        form.addRow("Harness Number *:", self.harness_input)

        # Initial Revision
        self.rev_input = QLineEdit("A")
        self.rev_input.setPlaceholderText("e.g. A, 01")
        form.addRow("Initial Revision Code *:", self.rev_input)

        self.sop_input = QLineEdit()
        self.sop_input.setPlaceholderText("e.g. SOP-001")
        form.addRow("SOP Number *:", self.sop_input)

        self.volume_spin = QSpinBox()
        self.volume_spin.setRange(0, 10000000)
        self.volume_spin.setValue(5000)
        form.addRow("Planned Volume:", self.volume_spin)

        self.circuits_spin = QSpinBox()
        self.circuits_spin.setRange(0, 5000)
        self.circuits_spin.setValue(20)
        form.addRow("Number of Circuits:", self.circuits_spin)

        layout.addLayout(form)

        button_box = QDialogButtonBox(
            QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel
        )
        button_box.accepted.connect(self._save)
        button_box.rejected.connect(self.reject)
        layout.addWidget(button_box)

    def _save(self) -> None:
        cust_id = self.customer_combo.currentData()
        if not cust_id:
            QMessageBox.warning(self, "Validation", "Please select a Customer.")
            return

        model_name = self.model_input.text().strip()
        harness_num = self.harness_input.text().strip()
        rev_code = self.rev_input.text().strip()
        sop_num = self.sop_input.text().strip()

        try:
            # 1. Project
            project = self.project_svc.get_or_create_project(cust_id, model_name)
            # 2. Harness
            harness = self.harness_svc.create_harness(project.id, harness_num)
            # 3. Initial Revision
            self.revision_svc.create_revision(
                harness_id=harness.id,
                revision_code=rev_code,
                sop_number=sop_num,
                volume=self.volume_spin.value(),
                circuit_count=self.circuits_spin.value(),
                status=ACTIVE_STATUS,
            )
            self.session.commit()
            self.accept()
        except BusinessValidationError as e:
            self.session.rollback()
            QMessageBox.warning(self, "Validation Error", e.message)
        except Exception as e:
            self.session.rollback()
            QMessageBox.critical(self, "Error", f"Failed to register harness:\n{e}")
