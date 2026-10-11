"""Individual Project / Model Kit List page."""
from PySide6.QtWidgets import (
    QWidget,
    QVBoxLayout,
    QHBoxLayout,
    QLabel,
    QComboBox,
    QPushButton,
)
from sqlalchemy.orm import Session
from app.engineering_tracker.services.project_service import ProjectService
from app.engineering_tracker.views.project_kit import get_project_kit_view
from app.engineering_tracker.ui.components.data_table import DataTableWidget


class ProjectKitPage(QWidget):
    """Project-level aggregated engineering lifecycle kit view."""

    def __init__(self, session: Session, parent=None):
        super().__init__(parent)
        self.session = session
        self.project_svc = ProjectService(session)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(14)

        # Header bar
        header_layout = QHBoxLayout()
        title_box = QVBoxLayout()
        header_lbl = QLabel("Individual Project / Model Kit List")
        header_lbl.setObjectName("pageHeader")
        sub_lbl = QLabel("Comprehensive project lifecycle view aggregating RFQs, ECNs, Revisions, BOMs, and Labels.")
        sub_lbl.setObjectName("pageSubheader")
        title_box.addWidget(header_lbl)
        title_box.addWidget(sub_lbl)
        header_layout.addLayout(title_box)

        header_layout.addStretch()

        self.project_combo = QComboBox()
        self.project_combo.setMinimumWidth(260)
        self.project_combo.currentIndexChanged.connect(self._on_project_changed)
        header_layout.addWidget(QLabel("Select Project:"))
        header_layout.addWidget(self.project_combo)

        self.refresh_btn = QPushButton("🔄 Refresh")
        self.refresh_btn.setProperty("class", "secondary")
        self.refresh_btn.clicked.connect(self.refresh)
        header_layout.addWidget(self.refresh_btn)

        layout.addLayout(header_layout)

        # Data Table
        columns = [
            "Customer",
            "Model",
            "Harness",
            "Revision",
            "SOP Number",
            "Volume",
            "Circuits",
            "RFQ Number",
            "RFQ Status",
            "Costing BOM Date",
            "ECN Number",
            "Stage",
            "Primary Engineer",
            "Target Date",
            "MIN Date",
            "BOM FG",
            "BOM Alt",
            "BOM Status",
            "Label Status",
            "Rack No",
            "File No",
        ]
        column_keys = [
            "customer",
            "model",
            "harness",
            "revision",
            "sop",
            "volume",
            "circuits",
            "rfq_number",
            "rfq_status",
            "costing_bom_date",
            "ecn_number",
            "stage_context",
            "primary_engineer",
            "target_date",
            "min_date",
            "bom_fg",
            "bom_alt",
            "bom_status",
            "label_status",
            "rack_number",
            "file_number",
        ]
        self.table_widget = DataTableWidget(columns, column_keys)
        layout.addWidget(self.table_widget)

        self.refresh()

    def refresh(self) -> None:
        """Reload project list and table data."""
        current_id = self.project_combo.currentData()
        self.project_combo.blockSignals(True)
        self.project_combo.clear()

        projects = self.project_svc.list_all_projects()
        for p in projects:
            self.project_combo.addItem(f"{p.customer.name} — {p.model_name}", p.id)

        if current_id:
            idx = self.project_combo.findData(current_id)
            if idx >= 0:
                self.project_combo.setCurrentIndex(idx)
        self.project_combo.blockSignals(False)

        self._load_table()

    def _on_project_changed(self) -> None:
        self._load_table()

    def _load_table(self) -> None:
        project_id = self.project_combo.currentData()
        if not project_id:
            self.table_widget.set_data([])
            return

        data = get_project_kit_view(self.session, project_id)
        self.table_widget.set_data(data)
