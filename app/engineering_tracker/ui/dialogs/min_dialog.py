"""MIN Meeting recording dialog."""
from datetime import date
from PySide6.QtWidgets import (
    QDialog,
    QVBoxLayout,
    QFormLayout,
    QDateEdit,
    QLineEdit,
    QTextEdit,
    QDialogButtonBox,
    QMessageBox,
    QLabel,
)
from PySide6.QtCore import QDate
from sqlalchemy.orm import Session
from app.engineering_tracker.services.min_service import MINService
from app.engineering_tracker.services.ecn_service import ECNService
from app.engineering_tracker.services.exceptions import (
    BusinessValidationError,
    DelayReasonRequiredError,
    DuplicateEntityError,
)


class MINMeetingDialog(QDialog):
    """Dialog for recording the MIN Meeting milestone for an ECN."""

    def __init__(self, session: Session, ecn_id: int, parent=None):
        super().__init__(parent)
        self.session = session
        self.ecn_id = ecn_id
        self.min_svc = MINService(session)
        self.ecn_svc = ECNService(session)
        self.ecn = self.ecn_svc.get_ecn_by_id(ecn_id)

        self.setWindowTitle(f"Record MIN Meeting — {self.ecn.ecn_number}")
        self.setMinimumWidth(450)

        layout = QVBoxLayout(self)
        form = QFormLayout()

        info = QLabel(
            f"<b>Target Date:</b> {self.ecn.target_date or 'Not Set'}<br>"
            f"<b>Primary Engineer:</b> {self.ecn.primary_engineer.name}<br>"
            f"<b>Harness:</b> {self.ecn.harness.harness_number}"
        )
        layout.addWidget(info)

        self.meeting_date_edit = QDateEdit(QDate.currentDate())
        self.meeting_date_edit.setCalendarPopup(True)
        form.addRow("MIN Meeting Date *:", self.meeting_date_edit)

        self.delay_reason_input = QLineEdit()
        if self.ecn.delay_reason:
            self.delay_reason_input.setText(self.ecn.delay_reason)
        self.delay_reason_input.setPlaceholderText("Mandatory if MIN date > Target date")
        form.addRow("Delay Reason:", self.delay_reason_input)

        self.remarks_input = QTextEdit()
        self.remarks_input.setMaximumHeight(80)
        self.remarks_input.setPlaceholderText("Meeting minutes / handoff remarks...")
        form.addRow("Remarks:", self.remarks_input)

        layout.addLayout(form)

        button_box = QDialogButtonBox(
            QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel
        )
        button_box.accepted.connect(self._save)
        button_box.rejected.connect(self.reject)
        layout.addWidget(button_box)

    def _save(self) -> None:
        qd = self.meeting_date_edit.date()
        m_date = date(qd.year(), qd.month(), qd.day())
        delay_reason = self.delay_reason_input.text().strip()
        remarks = self.remarks_input.toPlainText().strip()

        try:
            self.min_svc.record_min_meeting(
                ecn_id=self.ecn_id,
                meeting_date=m_date,
                remarks=remarks,
                delay_reason=delay_reason,
            )
            self.session.commit()
            QMessageBox.information(
                self,
                "MIN Meeting Recorded",
                f"MIN Meeting recorded successfully for {self.ecn.ecn_number}.\n"
                "ECN marked as Completed and Consolidated Kit List entry is now enabled.",
            )
            self.accept()
        except DelayReasonRequiredError as e:
            self.session.rollback()
            QMessageBox.critical(self, "Poka-Yoke: Delay Reason Required", e.message)
        except DuplicateEntityError as e:
            self.session.rollback()
            QMessageBox.critical(self, "Poka-Yoke: MIN Already Exists", e.message)
        except BusinessValidationError as e:
            self.session.rollback()
            QMessageBox.warning(self, "Validation Error", e.message)
        except Exception as e:
            self.session.rollback()
            QMessageBox.critical(self, "Error", f"Failed to record MIN meeting:\n{e}")
