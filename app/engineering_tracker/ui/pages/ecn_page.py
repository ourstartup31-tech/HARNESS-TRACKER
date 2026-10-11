"""ECN Tracker page."""
from PySide6.QtWidgets import (
    QWidget,
    QVBoxLayout,
    QHBoxLayout,
    QLabel,
    QPushButton,
    QMessageBox,
)
from sqlalchemy.orm import Session
from app.engineering_tracker.views.ecn_tracker import get_ecn_tracker_view
from app.engineering_tracker.ui.components.data_table import DataTableWidget
from app.engineering_tracker.ui.dialogs.ecn_dialog import ECNDialog
from app.engineering_tracker.ui.dialogs.min_dialog import MINMeetingDialog
from app.engineering_tracker.ui.dialogs.bom_dialog import BOMUploadDialog


class ECNPage(QWidget):
    """ECN Tracker view for monitoring engineering change work, MIN meetings, and delays."""

    def __init__(self, session: Session, parent=None):
        super().__init__(parent)
        self.session = session

        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(14)

        # Header bar
        header_layout = QHBoxLayout()
        title_box = QVBoxLayout()
        header_lbl = QLabel("ECN Tracker")
        header_lbl.setObjectName("pageHeader")
        sub_lbl = QLabel("Manage engineering change orders, revision impacts, MIN completion, and delays.")
        sub_lbl.setObjectName("pageSubheader")
        title_box.addWidget(header_lbl)
        title_box.addWidget(sub_lbl)
        header_layout.addLayout(title_box)

        header_layout.addStretch()

        self.add_btn = QPushButton("➕ Create ECN")
        self.add_btn.clicked.connect(self._create_ecn)
        header_layout.addWidget(self.add_btn)

        self.edit_btn = QPushButton("✏️ Edit Selected")
        self.edit_btn.setProperty("class", "secondary")
        self.edit_btn.clicked.connect(self._edit_selected)
        header_layout.addWidget(self.edit_btn)

        self.min_btn = QPushButton("🏁 Record MIN")
        self.min_btn.setProperty("class", "success")
        self.min_btn.clicked.connect(self._record_min)
        header_layout.addWidget(self.min_btn)

        self.bom_btn = QPushButton("📦 Upload BOM")
        self.bom_btn.setProperty("class", "secondary")
        self.bom_btn.clicked.connect(self._upload_bom)
        header_layout.addWidget(self.bom_btn)

        self.refresh_btn = QPushButton("🔄 Refresh")
        self.refresh_btn.setProperty("class", "secondary")
        self.refresh_btn.clicked.connect(self.refresh)
        header_layout.addWidget(self.refresh_btn)

        layout.addLayout(header_layout)

        # Data Table
        columns = [
            "ECN Number",
            "Customer",
            "Model",
            "Harness",
            "Source Rev",
            "Stage",
            "Type",
            "Impact",
            "New Rev",
            "Primary Eng",
            "Costing?",
            "Linked RFQ",
            "Target Date",
            "MIN Date",
            "Status",
            "Delay Days",
            "Delay Reason",
        ]
        column_keys = [
            "ecn_number",
            "customer",
            "model",
            "harness_number",
            "source_revision",
            "stage_context",
            "development_type",
            "revision_impact",
            "new_revision",
            "primary_engineer",
            "costing_required",
            "related_rfq",
            "target_date",
            "min_meeting_date",
            "ecn_status",
            "delay_days",
            "delay_reason",
        ]
        self.table_widget = DataTableWidget(columns, column_keys)
        self.table_widget.row_double_clicked.connect(self._on_row_double_clicked)
        layout.addWidget(self.table_widget)

        self.refresh()

    def refresh(self) -> None:
        """Reload ECN tracker data."""
        data = get_ecn_tracker_view(self.session)
        self.table_widget.set_data(data)

    def _create_ecn(self) -> None:
        dlg = ECNDialog(self.session, parent=self)
        if dlg.exec():
            self.refresh()

    def _edit_selected(self) -> None:
        row_data = self.table_widget.get_selected_row_data()
        if not row_data:
            QMessageBox.information(self, "Select Row", "Please select an ECN from the table to edit.")
            return
        dlg = ECNDialog(self.session, ecn_id=row_data["ecn_id"], parent=self)
        if dlg.exec():
            self.refresh()

    def _record_min(self) -> None:
        row_data = self.table_widget.get_selected_row_data()
        if not row_data:
            QMessageBox.information(self, "Select Row", "Please select an ECN to record its MIN Meeting.")
            return
        dlg = MINMeetingDialog(self.session, ecn_id=row_data["ecn_id"], parent=self)
        if dlg.exec():
            self.refresh()

    def _upload_bom(self) -> None:
        row_data = self.table_widget.get_selected_row_data()
        default_ecn_id = row_data["ecn_id"] if row_data else None
        dlg = BOMUploadDialog(self.session, default_ecn_id=default_ecn_id, parent=self)
        if dlg.exec():
            self.refresh()

    def _on_row_double_clicked(self, row_data: dict) -> None:
        dlg = ECNDialog(self.session, ecn_id=row_data["ecn_id"], parent=self)
        if dlg.exec():
            self.refresh()
