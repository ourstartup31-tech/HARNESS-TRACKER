"""Consolidated Active Kit List page."""
from PySide6.QtWidgets import (
    QWidget,
    QVBoxLayout,
    QHBoxLayout,
    QLabel,
    QPushButton,
    QMessageBox,
)
from sqlalchemy.orm import Session
from app.engineering_tracker.views.consolidated_kit import get_consolidated_kit_view
from app.engineering_tracker.ui.components.data_table import DataTableWidget
from app.engineering_tracker.ui.dialogs.kit_dialog import KitMetadataDialog


class ConsolidatedKitPage(QWidget):
    """Consolidated Active Kit List view generated from central records after MIN completion."""

    def __init__(self, session: Session, parent=None):
        super().__init__(parent)
        self.session = session

        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(14)

        # Header bar
        header_layout = QHBoxLayout()
        title_box = QVBoxLayout()
        header_lbl = QLabel("Consolidated Active Kit List")
        header_lbl.setObjectName("pageHeader")
        sub_lbl = QLabel("Generated automatically upon MIN meeting completion. Maintains physical master copy locations.")
        sub_lbl.setObjectName("pageSubheader")
        title_box.addWidget(header_lbl)
        title_box.addWidget(sub_lbl)
        header_layout.addLayout(title_box)

        header_layout.addStretch()

        self.edit_kit_btn = QPushButton("✏️ Edit Storage Info")
        self.edit_kit_btn.clicked.connect(self._edit_storage_info)
        header_layout.addWidget(self.edit_kit_btn)

        self.refresh_btn = QPushButton("🔄 Refresh")
        self.refresh_btn.setProperty("class", "secondary")
        self.refresh_btn.clicked.connect(self.refresh)
        header_layout.addWidget(self.refresh_btn)

        layout.addLayout(header_layout)

        # Data Table
        columns = [
            "ECN Number",
            "MIN Date",
            "Customer",
            "Model",
            "Harness",
            "Revision",
            "SOP Number",
            "Volume",
            "Circuits",
            "Stage",
            "Type",
            "Rack No",
            "File No",
            "Hard Copy Location",
            "Status",
        ]
        column_keys = [
            "ecn_number",
            "min_meeting_date",
            "customer_name",
            "model_name",
            "harness_number",
            "revision_code",
            "sop_number",
            "volume",
            "circuit_count",
            "stage_context",
            "development_type",
            "rack_number",
            "file_number",
            "hard_copy_location",
            "status",
        ]
        self.table_widget = DataTableWidget(columns, column_keys)
        self.table_widget.row_double_clicked.connect(self._on_row_double_clicked)
        layout.addWidget(self.table_widget)

        self.refresh()

    def refresh(self) -> None:
        """Reload Consolidated Kit records."""
        data = get_consolidated_kit_view(self.session)
        self.table_widget.set_data(data)

    def _edit_storage_info(self) -> None:
        row_data = self.table_widget.get_selected_row_data()
        if not row_data:
            QMessageBox.information(self, "Select Row", "Please select a Kit entry to edit storage metadata.")
            return
        dlg = KitMetadataDialog(self.session, ecn_id=row_data["ecn_id"], parent=self)
        if dlg.exec():
            self.refresh()

    def _on_row_double_clicked(self, row_data: dict) -> None:
        dlg = KitMetadataDialog(self.session, ecn_id=row_data["ecn_id"], parent=self)
        if dlg.exec():
            self.refresh()
