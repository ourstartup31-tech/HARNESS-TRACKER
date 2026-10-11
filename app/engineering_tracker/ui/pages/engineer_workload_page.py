"""Engineer Workload and Performance Dashboard page."""
from PySide6.QtWidgets import (
    QWidget,
    QVBoxLayout,
    QHBoxLayout,
    QGridLayout,
    QComboBox,
    QLabel,
    QTableWidget,
    QTableWidgetItem,
    QHeaderView,
)
from sqlalchemy.orm import Session
from app.engineering_tracker.services.engineer_service import EngineerService
from app.engineering_tracker.services.dashboard_service import DashboardService
from app.engineering_tracker.ui.components.stat_card import StatCard


class EngineerWorkloadPage(QWidget):
    """Workload, task allocations, upcoming targets, and duration metrics per engineer."""

    def __init__(self, session: Session, parent=None):
        super().__init__(parent)
        self.session = session
        self.engineer_svc = EngineerService(session)
        self.dash_svc = DashboardService(session)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(18)

        # Header bar
        header_layout = QHBoxLayout()
        title_box = QVBoxLayout()
        header_lbl = QLabel("Engineer Dashboard & Workload")
        header_lbl.setObjectName("pageHeader")
        sub_lbl = QLabel("Operational workload, upcoming target dates, duration variance, and project distribution.")
        sub_lbl.setObjectName("pageSubheader")
        title_box.addWidget(header_lbl)
        title_box.addWidget(sub_lbl)
        header_layout.addLayout(title_box)

        header_layout.addStretch()

        # Engineer selector
        self.engineer_combo = QComboBox()
        self.engineer_combo.setMinimumWidth(240)
        self.engineer_combo.currentIndexChanged.connect(self._on_engineer_changed)
        header_layout.addWidget(QLabel("Select Engineer:"))
        header_layout.addWidget(self.engineer_combo)

        layout.addLayout(header_layout)

        # Stat cards
        self.cards_grid = QGridLayout()
        self.cards_grid.setSpacing(12)

        self.card_open_ecns = StatCard("Open ECNs", "0", "Currently assigned", "#38bdf8")
        self.card_upcoming = StatCard("Upcoming Work", "0", "Due within 14 days", "#10b981")
        self.card_overdue = StatCard("Overdue Work", "0", "Past target date", "#ef4444")
        self.card_completed = StatCard("Completed ECNs", "0", "All time", "#a855f7")

        self.card_planned_avg = StatCard("Avg Planned Duration", "0 d", "Calendar days", "#f59e0b")
        self.card_actual_avg = StatCard("Avg Actual Duration", "0 d", "Work start to MIN", "#06b6d4")

        self.cards_grid.addWidget(self.card_open_ecns, 0, 0)
        self.cards_grid.addWidget(self.card_upcoming, 0, 1)
        self.cards_grid.addWidget(self.card_overdue, 0, 2)
        self.cards_grid.addWidget(self.card_completed, 0, 3)
        self.cards_grid.addWidget(self.card_planned_avg, 1, 0, 1, 2)
        self.cards_grid.addWidget(self.card_actual_avg, 1, 2, 1, 2)

        layout.addLayout(self.cards_grid)

        # Task Allocation Table
        section_lbl = QLabel("Assigned Tasks & Commitments")
        section_lbl.setStyleSheet("font-size: 15px; font-weight: 700; color: #f1f5f9; margin-top: 10px;")
        layout.addWidget(section_lbl)

        self.tasks_table = QTableWidget()
        self.tasks_table.setColumnCount(8)
        self.tasks_table.setHorizontalHeaderLabels([
            "ECN Number",
            "Harness",
            "Customer / Model",
            "Role",
            "Target Date",
            "MIN Date",
            "Status",
            "Delay Days",
        ])
        self.tasks_table.horizontalHeader().setStretchLastSection(True)
        self.tasks_table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        layout.addWidget(self.tasks_table)

        self.refresh()

    def refresh(self) -> None:
        """Reload engineers list and workload metrics."""
        current_id = self.engineer_combo.currentData()
        self.engineer_combo.blockSignals(True)
        self.engineer_combo.clear()

        engineers = self.engineer_svc.list_engineers(active_only=False)
        for eng in engineers:
            status_text = "" if eng.is_active else " (Inactive)"
            self.engineer_combo.addItem(f"{eng.name}{status_text}", eng.id)

        if current_id:
            idx = self.engineer_combo.findData(current_id)
            if idx >= 0:
                self.engineer_combo.setCurrentIndex(idx)
        self.engineer_combo.blockSignals(False)

        self._load_metrics()

    def _on_engineer_changed(self) -> None:
        self._load_metrics()

    def _load_metrics(self) -> None:
        eng_id = self.engineer_combo.currentData()
        if not eng_id:
            self._clear_cards()
            self.tasks_table.setRowCount(0)
            return

        data = self.dash_svc.get_engineer_workload_metrics(eng_id)
        if not data:
            self._clear_cards()
            self.tasks_table.setRowCount(0)
            return

        self.card_open_ecns.set_value(data.get("open_ecns_count", 0))
        self.card_upcoming.set_value(data.get("upcoming_ecns_count", 0))
        self.card_overdue.set_value(data.get("overdue_ecns_count", 0))
        self.card_completed.set_value(data.get("completed_ecns_count", 0))
        self.card_planned_avg.set_value(f"{data.get('avg_planned_duration_days', 0)} days")
        self.card_actual_avg.set_value(f"{data.get('avg_actual_duration_days', 0)} days")

        open_ecns = data.get("open_ecns", [])
        self.tasks_table.setRowCount(len(open_ecns))
        for row, e in enumerate(open_ecns):
            role = "Primary" if e.primary_engineer_id == eng_id else "Support"
            self.tasks_table.setItem(row, 0, QTableWidgetItem(e.ecn_number))
            self.tasks_table.setItem(row, 1, QTableWidgetItem(e.harness.harness_number))
            self.tasks_table.setItem(
                row, 2, QTableWidgetItem(f"{e.harness.project.customer.name} - {e.harness.project.model_name}")
            )
            self.tasks_table.setItem(row, 3, QTableWidgetItem(role))
            self.tasks_table.setItem(row, 4, QTableWidgetItem(str(e.target_date or "-")))
            self.tasks_table.setItem(row, 5, QTableWidgetItem(str(e.min_meeting_date or "-")))
            self.tasks_table.setItem(row, 6, QTableWidgetItem(e.ecn_status))
            self.tasks_table.setItem(row, 7, QTableWidgetItem(str(e.delay_days)))

    def _clear_cards(self) -> None:
        self.card_open_ecns.set_value(0)
        self.card_upcoming.set_value(0)
        self.card_overdue.set_value(0)
        self.card_completed.set_value(0)
        self.card_planned_avg.set_value("0 days")
        self.card_actual_avg.set_value("0 days")
