"""ECN creation and editing dialog."""
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
from app.engineering_tracker.services.ecn_service import ECNService
from app.engineering_tracker.services.harness_service import HarnessService
from app.engineering_tracker.services.revision_service import RevisionService
from app.engineering_tracker.services.engineer_service import EngineerService
from app.engineering_tracker.services.rfq_service import RFQService
from app.engineering_tracker.services.exceptions import (
    BusinessValidationError,
    AssignmentLockedError,
    CostingRFQRequiredError,
    DelayReasonRequiredError,
)
from app.engineering_tracker.config import (
    STAGE_CONTEXTS,
    DEV_TYPES,
    REVISION_IMPACTS,
    REVISION_IMPACT_NEW,
    REVISION_IMPACT_SAME,
    ECN_STATUS_IN_PROGRESS,
    ECN_STATUSES,
)


class ECNDialog(QDialog):
    """Dialog for creating or updating an ECN."""

    def __init__(self, session: Session, ecn_id: Optional[int] = None, parent=None):
        super().__init__(parent)
        self.session = session
        self.ecn_id = ecn_id
        self.ecn_svc = ECNService(session)
        self.harness_svc = HarnessService(session)
        self.revision_svc = RevisionService(session)
        self.engineer_svc = EngineerService(session)
        self.rfq_svc = RFQService(session)

        self.setWindowTitle("Edit ECN" if ecn_id else "Create New ECN")
        self.setMinimumWidth(600)

        layout = QVBoxLayout(self)
        form = QFormLayout()

        # 1. Harness & Source Revision
        self.harness_combo = QComboBox()
        self.harnesses = self.harness_svc.list_all_harnesses()
        for h in self.harnesses:
            self.harness_combo.addItem(
                f"{h.harness_number} ({h.project.customer.name} - {h.project.model_name})", h.id
            )
        self.harness_combo.currentIndexChanged.connect(self._on_harness_changed)
        form.addRow("Harness *:", self.harness_combo)

        self.source_rev_combo = QComboBox()
        form.addRow("Current/Source Revision *:", self.source_rev_combo)

        # 2. Classification
        self.stage_combo = QComboBox()
        self.stage_combo.addItems(STAGE_CONTEXTS)
        form.addRow("Stage / Context *:", self.stage_combo)

        self.dev_type_combo = QComboBox()
        self.dev_type_combo.addItems(DEV_TYPES)
        form.addRow("Development Type *:", self.dev_type_combo)

        # 3. Change Reason
        self.reason_input = QTextEdit()
        self.reason_input.setMaximumHeight(70)
        self.reason_input.setPlaceholderText("Detailed reason for engineering change...")
        form.addRow("Change / Reason *:", self.reason_input)

        # 4. Revision Impact
        self.impact_combo = QComboBox()
        self.impact_combo.addItems(REVISION_IMPACTS)
        self.impact_combo.currentIndexChanged.connect(self._on_impact_changed)
        form.addRow("Revision Impact *:", self.impact_combo)

        self.new_rev_combo = QComboBox()
        form.addRow("New Revision (if applicable):", self.new_rev_combo)

        # 5. Costing Required & Linked RFQ
        self.costing_check = QCheckBox("Costing Required (Yes/No)")
        self.costing_check.toggled.connect(self._on_costing_toggled)
        self.rfq_combo = QComboBox()
        form.addRow(self.costing_check)
        form.addRow("Related RFQ Number *:", self.rfq_combo)

        # 6. Engineers
        self.primary_eng_combo = QComboBox()
        self.support_eng_combo = QComboBox()
        self.support_eng_combo.addItem("None", None)
        self.engineers = self.engineer_svc.list_engineers(active_only=False)
        for e in self.engineers:
            label = f"{e.name}{'' if e.is_active else ' (Inactive)'}"
            self.primary_eng_combo.addItem(label, e.id)
            self.support_eng_combo.addItem(label, e.id)
        form.addRow("Primary Engineer *:", self.primary_eng_combo)
        form.addRow("Support Engineer (Optional):", self.support_eng_combo)

        # 7. Dates
        today_qdate = QDate.currentDate()
        self.input_date_check = QCheckBox("Design Input Date")
        self.input_date_edit = QDateEdit(today_qdate)
        self.input_date_edit.setCalendarPopup(True)
        form.addRow(self.input_date_check, self.input_date_edit)

        self.start_date_check = QCheckBox("Work Start Date")
        self.start_date_edit = QDateEdit(today_qdate)
        self.start_date_edit.setCalendarPopup(True)
        form.addRow(self.start_date_check, self.start_date_edit)

        self.target_date_edit = QDateEdit(today_qdate.addDays(14))
        self.target_date_edit.setCalendarPopup(True)
        form.addRow("Target Date *:", self.target_date_edit)

        self.min_date_check = QCheckBox("MIN Meeting Date")
        self.min_date_edit = QDateEdit(today_qdate)
        self.min_date_edit.setCalendarPopup(True)
        form.addRow(self.min_date_check, self.min_date_edit)

        # 8. Delay Reason
        self.delay_reason_input = QLineEdit()
        self.delay_reason_input.setPlaceholderText("Mandatory if MIN Date is later than Target Date")
        form.addRow("Delay Reason:", self.delay_reason_input)

        # 9. Status
        self.status_combo = QComboBox()
        self.status_combo.addItems(ECN_STATUSES)
        form.addRow("ECN Status *:", self.status_combo)

        layout.addLayout(form)

        button_box = QDialogButtonBox(
            QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel
        )
        button_box.accepted.connect(self._save)
        button_box.rejected.connect(self.reject)
        layout.addWidget(button_box)

        self._populate_harness_children()
        if ecn_id:
            self._load_ecn(ecn_id)

    def _on_harness_changed(self) -> None:
        self._populate_harness_children()

    def _populate_harness_children(self) -> None:
        self.source_rev_combo.clear()
        self.new_rev_combo.clear()
        self.rfq_combo.clear()
        self.rfq_combo.addItem("None", None)

        harness_id = self.harness_combo.currentData()
        if harness_id:
            revs = self.revision_svc.list_revisions_for_harness(harness_id)
            for r in revs:
                self.source_rev_combo.addItem(f"Rev {r.revision_code} ({r.status})", r.id)
                self.new_rev_combo.addItem(f"Rev {r.revision_code} ({r.status})", r.id)

            rfqs = self.rfq_svc.list_rfqs_for_harness(harness_id)
            for rfq in rfqs:
                self.rfq_combo.addItem(f"{rfq.rfq_number} ({rfq.overall_rfq_status})", rfq.id)

    def _on_impact_changed(self) -> None:
        is_new = self.impact_combo.currentText() == REVISION_IMPACT_NEW
        self.new_rev_combo.setEnabled(is_new)

    def _on_costing_toggled(self, checked: bool) -> None:
        self.rfq_combo.setEnabled(checked)

    def _load_ecn(self, ecn_id: int) -> None:
        ecn = self.ecn_svc.get_ecn_by_id(ecn_id)

        idx = self.harness_combo.findData(ecn.harness_id)
        if idx >= 0:
            self.harness_combo.setCurrentIndex(idx)
        self._populate_harness_children()

        s_idx = self.source_rev_combo.findData(ecn.source_revision_id)
        if s_idx >= 0:
            self.source_rev_combo.setCurrentIndex(s_idx)

        self.stage_combo.setCurrentText(ecn.stage_context)
        self.dev_type_combo.setCurrentText(ecn.development_type)
        self.reason_input.setPlainText(ecn.change_reason)
        self.impact_combo.setCurrentText(ecn.revision_impact)

        if ecn.new_revision_id:
            n_idx = self.new_rev_combo.findData(ecn.new_revision_id)
            if n_idx >= 0:
                self.new_rev_combo.setCurrentIndex(n_idx)

        self.costing_check.setChecked(ecn.costing_required)
        if ecn.rfq_id:
            r_idx = self.rfq_combo.findData(ecn.rfq_id)
            if r_idx >= 0:
                self.rfq_combo.setCurrentIndex(r_idx)

        p_idx = self.primary_eng_combo.findData(ecn.primary_engineer_id)
        if p_idx >= 0:
            self.primary_eng_combo.setCurrentIndex(p_idx)

        if ecn.support_engineer_id:
            sp_idx = self.support_eng_combo.findData(ecn.support_engineer_id)
            if sp_idx >= 0:
                self.support_eng_combo.setCurrentIndex(sp_idx)

        if ecn.design_input_date:
            self.input_date_check.setChecked(True)
            self.input_date_edit.setDate(QDate(ecn.design_input_date.year, ecn.design_input_date.month, ecn.design_input_date.day))

        if ecn.work_start_date:
            self.start_date_check.setChecked(True)
            self.start_date_edit.setDate(QDate(ecn.work_start_date.year, ecn.work_start_date.month, ecn.work_start_date.day))

        if ecn.target_date:
            self.target_date_edit.setDate(QDate(ecn.target_date.year, ecn.target_date.month, ecn.target_date.day))

        if ecn.min_meeting_date:
            self.min_date_check.setChecked(True)
            self.min_date_edit.setDate(QDate(ecn.min_meeting_date.year, ecn.min_meeting_date.month, ecn.min_meeting_date.day))

        self.delay_reason_input.setText(ecn.delay_reason or "")
        self.status_combo.setCurrentText(ecn.ecn_status)

    def _save(self) -> None:
        harness_id = self.harness_combo.currentData()
        source_rev_id = self.source_rev_combo.currentData()
        if not harness_id or not source_rev_id:
            QMessageBox.warning(self, "Validation", "Harness and Source Revision are required.")
            return

        def qdate_to_pydate(edit, check) -> Optional[date]:
            if check.isChecked():
                qd = edit.date()
                return date(qd.year(), qd.month(), qd.day())
            return None

        d_date = qdate_to_pydate(self.input_date_edit, self.input_date_check)
        w_date = qdate_to_pydate(self.start_date_edit, self.start_date_check)
        t_qd = self.target_date_edit.date()
        t_date = date(t_qd.year(), t_qd.month(), t_qd.day())
        m_date = qdate_to_pydate(self.min_date_edit, self.min_date_check)

        stage = self.stage_combo.currentText()
        dev_type = self.dev_type_combo.currentText()
        reason = self.reason_input.toPlainText().strip()
        impact = self.impact_combo.currentText()
        new_rev_id = self.new_rev_combo.currentData() if impact == REVISION_IMPACT_NEW else None

        costing = self.costing_check.isChecked()
        rfq_id = self.rfq_combo.currentData() if costing else None

        primary_eng_id = self.primary_eng_combo.currentData()
        support_eng_id = self.support_eng_combo.currentData()
        delay_reason = self.delay_reason_input.text().strip()
        status = self.status_combo.currentText()

        try:
            if self.ecn_id:
                self.ecn_svc.update_ecn(
                    ecn_id=self.ecn_id,
                    primary_engineer_id=primary_eng_id,
                    support_engineer_id=support_eng_id,
                    target_date=t_date,
                    work_start_date=w_date,
                    design_input_date=d_date,
                    min_meeting_date=m_date,
                    ecn_status=status,
                    delay_reason=delay_reason,
                    change_reason=reason,
                    costing_required=costing,
                    rfq_id=rfq_id,
                )
            else:
                self.ecn_svc.create_ecn(
                    harness_id=harness_id,
                    source_revision_id=source_rev_id,
                    stage_context=stage,
                    development_type=dev_type,
                    change_reason=reason,
                    primary_engineer_id=primary_eng_id,
                    target_date=t_date,
                    revision_impact=impact,
                    new_revision_id=new_rev_id,
                    costing_required=costing,
                    rfq_id=rfq_id,
                    support_engineer_id=support_eng_id,
                    design_input_date=d_date,
                    work_start_date=w_date,
                    min_meeting_date=m_date,
                    ecn_status=status,
                    delay_reason=delay_reason,
                )
            self.session.commit()
            self.accept()
        except AssignmentLockedError as e:
            self.session.rollback()
            QMessageBox.critical(self, "Poka-Yoke: Engineer Assignment Locked", e.message)
        except CostingRFQRequiredError as e:
            self.session.rollback()
            QMessageBox.critical(self, "Poka-Yoke: RFQ Required", e.message)
        except DelayReasonRequiredError as e:
            self.session.rollback()
            QMessageBox.critical(self, "Poka-Yoke: Delay Reason Required", e.message)
        except BusinessValidationError as e:
            self.session.rollback()
            QMessageBox.warning(self, "Validation Error", e.message)
        except Exception as e:
            self.session.rollback()
            QMessageBox.critical(self, "Error", f"Failed to save ECN:\n{e}")
