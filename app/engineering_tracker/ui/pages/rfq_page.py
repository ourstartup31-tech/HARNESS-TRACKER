"""RFQ Tracker page."""
from PySide6.QtWidgets import (
    QWidget,
    QVBoxLayout,
    QHBoxLayout,
    QLabel,
    QPushButton,
    QMessageBox,
)
from sqlalchemy.orm import Session
from app.engineering_tracker.views.rfq_tracker import get_rfq_tracker_view
from app.engineering_tracker.ui.components.data_table import DataTableWidget
from app.engineering_tracker.ui.dialogs.rfq_dialog import RFQDialog


class RFQPage(QWidget):
    """RFQ Tracker view for monitoring commercial costing milestones."""

    def __init__(self, session: Session, parent=None):
        super().__init__(parent)
        self.session = session

        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(14)

        # Header bar
        header_layout = QHBoxLayout()
        title_box = QVBoxLayout()
        header_lbl = QLabel("RFQ Tracker")
        header_lbl.setObjectName("pageHeader")
        sub_lbl = QLabel("Track commercial-to-engineering costing milestones, queries, and proposals.")
        sub_lbl.setObjectName("pageSubheader")
        title_box.addWidget(header_lbl)
        title_box.addWidget(sub_lbl)
        header_layout.addLayout(title_box)

        header_layout.addStretch()

        self.add_btn = QPushButton("➕ Create RFQ")
        self.add_btn.clicked.connect(self._create_rfq)
        header_layout.addWidget(self.add_btn)

        self.edit_btn = QPushButton("✏️ Edit Selected")
        self.edit_btn.setProperty("class", "secondary")
        self.edit_btn.clicked.connect(self._edit_selected)
        header_layout.addWidget(self.edit_btn)

        self.refresh_btn = QPushButton("🔄 Refresh")
        self.refresh_btn.setProperty("class", "secondary")
        self.refresh_btn.clicked.connect(self.refresh)
        header_layout.addWidget(self.refresh_btn)

        layout.addLayout(header_layout)

        # Data Table
        columns = [
            "RFQ Number",
            "Customer",
            "Model",
            "Harness",
            "Revision",
            "SOP Number",
            "Circuits",
            "Work Start",
            "Target Date",
            "Costing BOM Sub.",
            "Query?",
            "Query Status",
            "Proposal?",
            "Status",
        ]
        column_keys = [
            "rfq_number",
            "customer",
            "model",
            "harness_number",
            "revision",
            "sop_number",
            "circuit_count",
            "work_start_date",
            "target_date",
            "costing_bom_submitted_date",
            "query_yes_no",
            "query_status",
            "proposal_yes_no",
            "overall_status",
        ]
        self.table_widget = DataTableWidget(columns, column_keys)
        self.table_widget.row_double_clicked.connect(self._on_row_double_clicked)
        layout.addWidget(self.table_widget)

        self.refresh()

    def refresh(self) -> None:
        """Reload RFQ tracker data."""
        data = get_rfq_tracker_view(self.session)
        self.table_widget.set_data(data)

    def _create_rfq(self) -> None:
        dlg = RFQDialog(self.session, parent=self)
        if dlg.exec():
            self.refresh()

    def _edit_selected(self) -> None:
        row_data = self.table_widget.get_selected_row_data()
        if not row_data:
            QMessageBox.information(self, "Select Row", "Please select an RFQ from the table to edit.")
            return
        dlg = RFQDialog(self.session, rfq_id=row_data["rfq_id"], parent=self)
        if dlg.exec():
            self.refresh()

    def _on_row_double_clicked(self, row_data: dict) -> None:
        dlg = RFQDialog(self.session, rfq_id=row_data["rfq_id"], parent=self)
        if dlg.exec():
            self.refresh()
