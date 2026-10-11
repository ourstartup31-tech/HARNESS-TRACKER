"""Model / Project Dashboard page."""
from PySide6.QtWidgets import (
    QWidget,
    QVBoxLayout,
    QHBoxLayout,
    QGridLayout,
    QComboBox,
    QLabel,
    QPushButton,
    QTableWidget,
    QTableWidgetItem,
    QHeaderView,
    QMessageBox,
)
from PySide6.QtGui import QFont
from PySide6.QtCore import Qt
from sqlalchemy.orm import Session
from app.engineering_tracker.services.project_service import ProjectService
from app.engineering_tracker.services.dashboard_service import DashboardService
from app.engineering_tracker.ui.components.stat_card import StatCard
from app.engineering_tracker.views.harness_history import get_harness_revision_history
from app.engineering_tracker.ui.dialogs.harness_dialog import HarnessDialog


class ProjectDashboardPage(QWidget):
    """High-level status summary and drill-down for the entire project."""

    def __init__(self, session: Session, parent=None):
        super().__init__(parent)
        self.session = session
        self.project_svc = ProjectService(session)
        self.dash_svc = DashboardService(session)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 20, 24, 24)
        layout.setSpacing(16)

        # Centered DESPL Heading (Calibri, Golden)
        self.despl_heading = QLabel("DESPL")
        self.despl_heading.setAlignment(Qt.AlignmentFlag.AlignCenter)
        despl_font = QFont("Calibri", 30, QFont.Weight.Bold)
        self.despl_heading.setFont(despl_font)
        self.despl_heading.setStyleSheet(
            """
            QLabel {
                font-family: 'Calibri', sans-serif;
                font-size: 38px;
                font-weight: 700;
                color: #d4af37; /* Golden */
                letter-spacing: 6px;
                padding: 0px 0px 4px 0px;
            }
            """
        )
        layout.addWidget(self.despl_heading)

        # Header bar
        header_layout = QHBoxLayout()
        title_box = QVBoxLayout()
        header_lbl = QLabel("Model / Project Dashboard")
        header_lbl.setObjectName("pageHeader")
        sub_lbl = QLabel("Project-level visibility across harnesses, revisions, ECNs, and releases.")
        sub_lbl.setObjectName("pageSubheader")
        title_box.addWidget(header_lbl)
        title_box.addWidget(sub_lbl)
        header_layout.addLayout(title_box)

        header_layout.addStretch()

        # Project Selector
        self.project_combo = QComboBox()
        self.project_combo.setMinimumWidth(260)
        self.project_combo.currentIndexChanged.connect(self._on_project_changed)
        header_layout.addWidget(QLabel("Select Project:"))
        header_layout.addWidget(self.project_combo)

        # Register Harness Button
        self.add_harness_btn = QPushButton("➕ Register Harness")
        self.add_harness_btn.clicked.connect(self._register_harness)
        header_layout.addWidget(self.add_harness_btn)

        layout.addLayout(header_layout)

        # KPI Stat Cards Grid
        self.cards_grid = QGridLayout()
        self.cards_grid.setSpacing(12)

        self.card_harnesses = StatCard("Total Harnesses", "0", "In current model", "#38bdf8")
        self.card_active_revs = StatCard("Active Revisions", "0", "One active per harness", "#10b981")
        self.card_open_rfqs = StatCard("Open RFQs", "0", "Costing in progress", "#f59e0b")
        self.card_open_ecns = StatCard("Open ECNs", "0", "Active change orders", "#6366f1")

        self.card_pending_boms = StatCard("Pending BOMs", "0", "Awaiting release", "#ec4899")
        self.card_pending_labels = StatCard("Pending Labels", "0", "Released BOMs without label", "#eab308")
        self.card_min_completed = StatCard("MIN Completed", "0", "Handoff ready", "#14b8a6")
        self.card_delayed = StatCard("Delayed Tasks", "0", "Exceeded target date", "#ef4444")

        self.cards_grid.addWidget(self.card_harnesses, 0, 0)
        self.cards_grid.addWidget(self.card_active_revs, 0, 1)
        self.cards_grid.addWidget(self.card_open_rfqs, 0, 2)
        self.cards_grid.addWidget(self.card_open_ecns, 0, 3)

        self.cards_grid.addWidget(self.card_pending_boms, 1, 0)
        self.cards_grid.addWidget(self.card_pending_labels, 1, 1)
        self.cards_grid.addWidget(self.card_min_completed, 1, 2)
        self.cards_grid.addWidget(self.card_delayed, 1, 3)

        layout.addLayout(self.cards_grid)

        # Harness Breakdown Table
        section_lbl = QLabel("Harnesses in Project")
        section_lbl.setStyleSheet("font-size: 15px; font-weight: 700; color: #f1f5f9; margin-top: 10px;")
        layout.addWidget(section_lbl)

        self.harness_table = QTableWidget()
        self.harness_table.setColumnCount(5)
        self.harness_table.setHorizontalHeaderLabels([
            "Harness Number",
            "Total Revisions",
            "Active Revision",
            "Total RFQs",
            "Total ECNs",
        ])
        self.harness_table.horizontalHeader().setStretchLastSection(True)
        self.harness_table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        self.harness_table.cellDoubleClicked.connect(self._show_harness_history)
        layout.addWidget(self.harness_table)

        self.refresh()

    def refresh(self) -> None:
        """Reload project list and dashboard data."""
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

        self._load_metrics()

    def _on_project_changed(self) -> None:
        self._load_metrics()

    def _load_metrics(self) -> None:
        project_id = self.project_combo.currentData()
        if not project_id:
            self._clear_cards()
            self.harness_table.setRowCount(0)
            return

        data = self.dash_svc.get_project_dashboard_metrics(project_id)
        if not data:
            self._clear_cards()
            self.harness_table.setRowCount(0)
            return

        self.card_harnesses.set_value(data.get("total_harnesses", 0))
        self.card_active_revs.set_value(data.get("active_revisions", 0))
        self.card_open_rfqs.set_value(data.get("open_rfqs", 0))
        self.card_open_ecns.set_value(data.get("open_ecns", 0))
        self.card_pending_boms.set_value(data.get("pending_bom_releases", 0))
        self.card_pending_labels.set_value(data.get("pending_labels", 0))
        self.card_min_completed.set_value(data.get("min_completed", 0))
        self.card_delayed.set_value(data.get("delayed_ecns", 0))

        harnesses = data.get("harnesses", [])
        self.harness_table.setRowCount(len(harnesses))
        for row, h in enumerate(harnesses):
            item_num = QTableWidgetItem(h["harness_number"])
            item_num.setData(Qt.ItemDataRole.UserRole, h["harness_id"])
            self.harness_table.setItem(row, 0, item_num)
            self.harness_table.setItem(row, 1, QTableWidgetItem(str(h["total_revisions"])))
            self.harness_table.setItem(row, 2, QTableWidgetItem(h["active_revision"]))
            self.harness_table.setItem(row, 3, QTableWidgetItem(str(h["total_rfqs"])))
            self.harness_table.setItem(row, 4, QTableWidgetItem(str(h["total_ecns"])))

    def _clear_cards(self) -> None:
        self.card_harnesses.set_value(0)
        self.card_active_revs.set_value(0)
        self.card_open_rfqs.set_value(0)
        self.card_open_ecns.set_value(0)
        self.card_pending_boms.set_value(0)
        self.card_pending_labels.set_value(0)
        self.card_min_completed.set_value(0)
        self.card_delayed.set_value(0)

    def _register_harness(self) -> None:
        dlg = HarnessDialog(self.session, self)
        if dlg.exec():
            self.refresh()

    def _show_harness_history(self, row: int, col: int) -> None:
        item = self.harness_table.item(row, 0)
        if not item:
            return
        harness_id = item.data(Qt.ItemDataRole.UserRole)
        history = get_harness_revision_history(self.session, harness_id)
        if not history:
            QMessageBox.information(self, "History", "No revision records found.")
            return

        lines = [f"<b>Revision History for {item.text()}:</b><br>"]
        for h in history:
            lines.append(
                f"• Rev <b>{h['revision_code']}</b> ({h['status']}) | SOP: {h['sop_number']} | "
                f"Volume: {h['volume']} | Circuits: {h['circuit_count']} | Created: {h['created_date']} by {h['created_by']}"
            )
        QMessageBox.information(self, f"Harness History — {item.text()}", "<br>".join(lines))
