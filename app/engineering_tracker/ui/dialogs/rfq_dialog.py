"""RFQ creation and editing dialog."""
from datetime import date
from typing import Optional
from PySide6.QtWidgets import (
    QDialog,
    QVBoxLayout,
    QFormLayout,
    QComboBox,
    QDateEdit,
    QCheckBox,
    QLineEdit,
    QTextEdit,
    QDialogButtonBox,
    QMessageBox,
    QGroupBox,
)
from PySide6.QtCore import QDate
from sqlalchemy.orm import Session
from app.engineering_tracker.services.rfq_service import RFQService
from app.engineering_tracker.services.harness_service import HarnessService
from app.engineering_tracker.services.revision_service import RevisionService
from app.engineering_tracker.services.exceptions import BusinessValidationError
from app.engineering_tracker.config import (
    RFQ_STATUS_OPEN,
    RFQ_STATUSES,
    QUERY_STATUSES,
    QUERY_STATUS_OPEN,
    PROPOSAL_STATUSES,
    PROPOSAL_STATUS_PENDING,
)


class RFQDialog(QDialog):
    """Dialog for creating or updating an RFQ."""

    def __init__(self, session: Session, rfq_id: Optional[int] = None, parent=None):
        super().__init__(parent)
        self.session = session
        self.rfq_id = rfq_id
        self.rfq_svc = RFQService(session)
        self.harness_svc = HarnessService(session)
        self.revision_svc = RevisionService(session)

        self.setWindowTitle("Edit RFQ" if rfq_id else "Create New RFQ")
        self.setMinimumWidth(550)

        layout = QVBoxLayout(self)
        form = QFormLayout()

        # Harness & Revision
        self.harness_combo = QComboBox()
        self.harnesses = self.harness_svc.list_all_harnesses()
        for h in self.harnesses:
            self.harness_combo.addItem(
                f"{h.harness_number} ({h.project.customer.name} - {h.project.model_name})", h.id
            )
        self.harness_combo.currentIndexChanged.connect(self._on_harness_changed)
        form.addRow("Harness *:", self.harness_combo)

        self.rev_combo = QComboBox()
        form.addRow("Revision *:", self.rev_combo)
        self._populate_revisions()

        # Milestones
        today_qdate = QDate.currentDate()

        self.marketing_date_check = QCheckBox("Record Marketing Input Date")
        self.marketing_date_edit = QDateEdit(today_qdate)
        self.marketing_date_edit.setCalendarPopup(True)
        form.addRow(self.marketing_date_check, self.marketing_date_edit)

        self.design_date_check = QCheckBox("Record Design Input Date")
        self.design_date_edit = QDateEdit(today_qdate)
        self.design_date_edit.setCalendarPopup(True)
        form.addRow(self.design_date_check, self.design_date_edit)

        self.start_date_check = QCheckBox("Record Work Start Date")
        self.start_date_edit = QDateEdit(today_qdate)
        self.start_date_edit.setCalendarPopup(True)
        form.addRow(self.start_date_check, self.start_date_edit)

        self.target_date_check = QCheckBox("Record Target Date")
        self.target_date_edit = QDateEdit(today_qdate.addDays(7))
        self.target_date_edit.setCalendarPopup(True)
        form.addRow(self.target_date_check, self.target_date_edit)

        self.costing_date_check = QCheckBox("Record Costing BOM Submitted Date")
        self.costing_date_edit = QDateEdit(today_qdate)
        self.costing_date_edit.setCalendarPopup(True)
        form.addRow(self.costing_date_check, self.costing_date_edit)

        # Query Group
        query_group = QGroupBox("Query Management")
        q_layout = QFormLayout(query_group)
        self.query_check = QCheckBox("Query Raised (Yes/No)")
        self.query_status_combo = QComboBox()
        self.query_status_combo.addItems(QUERY_STATUSES)
        self.query_remark_input = QLineEdit()
        self.query_remark_input.setPlaceholderText("Query details / blocking reason")
        q_layout.addRow(self.query_check)
        q_layout.addRow("Query Status:", self.query_status_combo)
        q_layout.addRow("Query Remark:", self.query_remark_input)
        form.addRow(query_group)

        # Proposal Group
        prop_group = QGroupBox("Proposal Management")
        p_layout = QFormLayout(prop_group)
        self.proposal_check = QCheckBox("Proposal Submitted (Yes/No)")
        self.proposal_status_combo = QComboBox()
        self.proposal_status_combo.addItems(PROPOSAL_STATUSES)
        self.proposal_remark_input = QLineEdit()
        self.proposal_remark_input.setPlaceholderText("Proposal remarks")
        p_layout.addRow(self.proposal_check)
        p_layout.addRow("Proposal Status:", self.proposal_status_combo)
        p_layout.addRow("Proposal Remark:", self.proposal_remark_input)
        form.addRow(prop_group)

        # Status
        self.status_combo = QComboBox()
        self.status_combo.addItems(RFQ_STATUSES)
        form.addRow("Overall RFQ Status *:", self.status_combo)

        layout.addLayout(form)

        button_box = QDialogButtonBox(
            QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel
        )
        button_box.accepted.connect(self._save)
        button_box.rejected.connect(self.reject)
        layout.addWidget(button_box)

        if rfq_id:
            self._load_rfq(rfq_id)

    def _on_harness_changed(self) -> None:
        self._populate_revisions()

    def _populate_revisions(self) -> None:
        self.rev_combo.clear()
        harness_id = self.harness_combo.currentData()
        if harness_id:
            revs = self.revision_svc.list_revisions_for_harness(harness_id)
            for r in revs:
                self.rev_combo.addItem(f"Rev {r.revision_code} ({r.status})", r.id)

    def _load_rfq(self, rfq_id: int) -> None:
        rfq = self.rfq_svc.get_rfq_by_id(rfq_id)
        # Select harness and revision
        idx = self.harness_combo.findData(rfq.harness_id)
        if idx >= 0:
            self.harness_combo.setCurrentIndex(idx)
        self._populate_revisions()
        r_idx = self.rev_combo.findData(rfq.revision_id)
        if r_idx >= 0:
            self.rev_combo.setCurrentIndex(r_idx)

        if rfq.marketing_input_date:
            self.marketing_date_check.setChecked(True)
            self.marketing_date_edit.setDate(QDate(rfq.marketing_input_date.year, rfq.marketing_input_date.month, rfq.marketing_input_date.day))
        if rfq.design_input_date:
            self.design_date_check.setChecked(True)
            self.design_date_edit.setDate(QDate(rfq.design_input_date.year, rfq.design_input_date.month, rfq.design_input_date.day))
        if rfq.work_start_date:
            self.start_date_check.setChecked(True)
            self.start_date_edit.setDate(QDate(rfq.work_start_date.year, rfq.work_start_date.month, rfq.work_start_date.day))
        if rfq.target_date:
            self.target_date_check.setChecked(True)
            self.target_date_edit.setDate(QDate(rfq.target_date.year, rfq.target_date.month, rfq.target_date.day))
        if rfq.costing_bom_submitted_date:
            self.costing_date_check.setChecked(True)
            self.costing_date_edit.setDate(QDate(rfq.costing_bom_submitted_date.year, rfq.costing_bom_submitted_date.month, rfq.costing_bom_submitted_date.day))

        self.query_check.setChecked(rfq.query_yes_no)
        if rfq.query_status:
            self.query_status_combo.setCurrentText(rfq.query_status)
        self.query_remark_input.setText(rfq.query_remark or "")

        self.proposal_check.setChecked(rfq.proposal_yes_no)
        if rfq.proposal_status:
            self.proposal_status_combo.setCurrentText(rfq.proposal_status)
        self.proposal_remark_input.setText(rfq.proposal_remark or "")

        self.status_combo.setCurrentText(rfq.overall_rfq_status)

    def _save(self) -> None:
        harness_id = self.harness_combo.currentData()
        rev_id = self.rev_combo.currentData()
        if not harness_id or not rev_id:
            QMessageBox.warning(self, "Validation", "Harness and Revision are required.")
            return

        def qdate_to_pydate(edit, check) -> Optional[date]:
            if check.isChecked():
                qd = edit.date()
                return date(qd.year(), qd.month(), qd.day())
            return None

        m_date = qdate_to_pydate(self.marketing_date_edit, self.marketing_date_check)
        d_date = qdate_to_pydate(self.design_date_edit, self.design_date_check)
        w_date = qdate_to_pydate(self.start_date_edit, self.start_date_check)
        t_date = qdate_to_pydate(self.target_date_edit, self.target_date_check)
        c_date = qdate_to_pydate(self.costing_date_edit, self.costing_date_check)

        q_yes = self.query_check.isChecked()
        q_stat = self.query_status_combo.currentText() if q_yes else None
        q_rem = self.query_remark_input.text() if q_yes else None

        p_yes = self.proposal_check.isChecked()
        p_stat = self.proposal_status_combo.currentText() if p_yes else None
        p_rem = self.proposal_remark_input.text() if p_yes else None

        status = self.status_combo.currentText()

        try:
            if self.rfq_id:
                self.rfq_svc.update_rfq(
                    rfq_id=self.rfq_id,
                    marketing_input_date=m_date,
                    design_input_date=d_date,
                    work_start_date=w_date,
                    target_date=t_date,
                    costing_bom_submitted_date=c_date,
                    query_yes_no=q_yes,
                    query_status=q_stat,
                    query_remark=q_rem,
                    proposal_yes_no=p_yes,
                    proposal_status=p_stat,
                    proposal_remark=p_rem,
                    overall_rfq_status=status,
                )
            else:
                self.rfq_svc.create_rfq(
                    harness_id=harness_id,
                    revision_id=rev_id,
                    marketing_input_date=m_date,
                    design_input_date=d_date,
                    work_start_date=w_date,
                    target_date=t_date,
                    costing_bom_submitted_date=c_date,
                    query_yes_no=q_yes,
                    query_status=q_stat,
                    query_remark=q_rem,
                    proposal_yes_no=p_yes,
                    proposal_status=p_stat,
                    proposal_remark=p_rem,
                    overall_rfq_status=status,
                )
            self.session.commit()
            self.accept()
        except BusinessValidationError as e:
            self.session.rollback()
            QMessageBox.critical(self, "Poka-Yoke Validation Error", e.message)
        except Exception as e:
            self.session.rollback()
            QMessageBox.critical(self, "Error", f"Failed to save RFQ:\n{e}")
