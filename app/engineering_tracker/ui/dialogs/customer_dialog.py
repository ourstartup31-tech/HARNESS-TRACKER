"""Customer Master management dialog."""
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
from app.engineering_tracker.services.customer_service import CustomerService
from app.engineering_tracker.services.exceptions import BusinessValidationError


class CustomerDialog(QDialog):
    """Dialog for creating or modifying a Customer."""

    def __init__(self, session: Session, customer_id: int | None = None, parent=None):
        super().__init__(parent)
        self.session = session
        self.customer_id = customer_id
        self.customer_svc = CustomerService(session)

        self.setWindowTitle("Edit Customer" if customer_id else "Add New Customer")
        self.setMinimumWidth(380)

        layout = QVBoxLayout(self)
        form = QFormLayout()

        self.name_input = QLineEdit()
        self.name_input.setPlaceholderText("e.g. Tata Motors, Maruti Suzuki")
        form.addRow("Customer Name *:", self.name_input)

        self.active_check = QCheckBox("Active")
        self.active_check.setChecked(True)
        if customer_id:
            form.addRow("Status:", self.active_check)

        layout.addLayout(form)

        button_box = QDialogButtonBox(
            QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel
        )
        button_box.accepted.connect(self._save)
        button_box.rejected.connect(self.reject)
        layout.addWidget(button_box)

        if customer_id:
            cust = self.customer_svc.get_customer_by_id(customer_id)
            self.name_input.setText(cust.name)
            self.active_check.setChecked(cust.is_active)

    def _save(self) -> None:
        name = self.name_input.text().strip()
        try:
            if self.customer_id:
                self.customer_svc.update_customer(self.customer_id, name)
                self.customer_svc.set_active_status(
                    self.customer_id, self.active_check.isChecked()
                )
            else:
                self.customer_svc.create_customer(name)
            self.session.commit()
            self.accept()
        except BusinessValidationError as e:
            QMessageBox.warning(self, "Validation Error", e.message)
        except Exception as e:
            QMessageBox.critical(self, "Error", f"Failed to save customer:\n{e}")
