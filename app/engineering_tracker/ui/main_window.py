"""Main Application Window with Sidebar Navigation."""
from PySide6.QtWidgets import (
    QMainWindow,
    QWidget,
    QHBoxLayout,
    QVBoxLayout,
    QPushButton,
    QStackedWidget,
    QLabel,
    QFrame,
    QButtonGroup,
)
from PySide6.QtCore import Qt
from sqlalchemy.orm import Session
from app.engineering_tracker.config import DEFAULT_USER
from app.engineering_tracker.ui.styles import MODERN_STYLE_SHEET
from app.engineering_tracker.ui.pages.project_dashboard_page import ProjectDashboardPage
from app.engineering_tracker.ui.pages.engineer_workload_page import EngineerWorkloadPage
from app.engineering_tracker.ui.pages.rfq_page import RFQPage
from app.engineering_tracker.ui.pages.ecn_page import ECNPage
from app.engineering_tracker.ui.pages.bom_page import BOMPage
from app.engineering_tracker.ui.pages.consolidated_kit_page import ConsolidatedKitPage
from app.engineering_tracker.ui.pages.project_kit_page import ProjectKitPage
from app.engineering_tracker.ui.pages.master_data_page import MasterDataPage


class MainWindow(QMainWindow):
    """Main desktop application window."""

    def __init__(self, session: Session):
        super().__init__()
        self.session = session

        self.setWindowTitle("45 Engineering Tracker — Automotive Wiring Harness Management")
        self.resize(1340, 840)
        self.setMinimumSize(1100, 700)
        self.setStyleSheet(MODERN_STYLE_SHEET)

        # Central container
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QHBoxLayout(central_widget)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)

        # 1. Sidebar
        sidebar = self._build_sidebar()
        main_layout.addWidget(sidebar)

        # 2. Stacked Pages
        self.stack = QStackedWidget()
        self.stack.setObjectName("contentArea")

        self.page_dashboard = ProjectDashboardPage(session)
        self.page_workload = EngineerWorkloadPage(session)
        self.page_rfq = RFQPage(session)
        self.page_ecn = ECNPage(session)
        self.page_bom = BOMPage(session)
        self.page_consolidated_kit = ConsolidatedKitPage(session)
        self.page_project_kit = ProjectKitPage(session)
        self.page_master_data = MasterDataPage(session)

        self.stack.addWidget(self.page_dashboard)
        self.stack.addWidget(self.page_workload)
        self.stack.addWidget(self.page_rfq)
        self.stack.addWidget(self.page_ecn)
        self.stack.addWidget(self.page_bom)
        self.stack.addWidget(self.page_consolidated_kit)
        self.stack.addWidget(self.page_project_kit)
        self.stack.addWidget(self.page_master_data)

        main_layout.addWidget(self.stack)

        # Select first tab by default
        self.nav_buttons[0].setChecked(True)

    def _build_sidebar(self) -> QWidget:
        sidebar = QFrame()
        sidebar.setObjectName("sidebar")
        layout = QVBoxLayout(sidebar)
        layout.setContentsMargins(0, 0, 0, 16)
        layout.setSpacing(4)

        # Header
        header = QFrame()
        header.setObjectName("sidebarHeader")
        h_layout = QVBoxLayout(header)
        h_layout.setContentsMargins(16, 16, 16, 16)
        title = QLabel("45 ENGINEERING TRACKER")
        title.setObjectName("appTitle")
        sub = QLabel("Centralized Automotive System")
        sub.setObjectName("appSubtitle")
        h_layout.addWidget(title)
        h_layout.addWidget(sub)
        layout.addWidget(header)

        layout.addSpacing(10)

        # Navigation Buttons
        self.btn_group = QButtonGroup(self)
        self.btn_group.setExclusive(True)
        self.nav_buttons = []

        nav_items = [
            ("📊  Project Dashboard", 0),
            ("👷  Engineer Workload", 1),
            ("📑  RFQ Tracker", 2),
            ("🔄  ECN Tracker", 3),
            ("📦  BOM & Label Upload", 4),
            ("🗂️  Consolidated Active Kit", 5),
            ("📂  Project Kit List", 6),
            ("⚙️  Master Data", 7),
        ]

        for text, index in nav_items:
            btn = QPushButton(text)
            btn.setObjectName("navButton")
            btn.setCheckable(True)
            btn.clicked.connect(lambda checked, idx=index: self._on_nav_clicked(idx))
            self.btn_group.addButton(btn, index)
            self.nav_buttons.append(btn)
            layout.addWidget(btn)

        layout.addStretch()

        # Footer Status Card
        footer_card = QFrame()
        footer_card.setStyleSheet(
            """
            background-color: #0f172a;
            border: 1px solid #334155;
            border-radius: 8px;
            margin: 0px 12px;
            padding: 10px;
            """
        )
        f_layout = QVBoxLayout(footer_card)
        f_layout.setContentsMargins(8, 8, 8, 8)
        f_layout.setSpacing(2)

        user_lbl = QLabel(f"👤 User: <b>{DEFAULT_USER}</b>")
        user_lbl.setStyleSheet("font-size: 11px; color: #cbd5e1;")
        db_lbl = QLabel("🟢 Database: SQLite Online")
        db_lbl.setStyleSheet("font-size: 11px; color: #10b981;")

        f_layout.addWidget(user_lbl)
        f_layout.addWidget(db_lbl)
        layout.addWidget(footer_card)

        return sidebar

    def _on_nav_clicked(self, index: int) -> None:
        self.stack.setCurrentIndex(index)
        current_widget = self.stack.currentWidget()
        if hasattr(current_widget, "refresh"):
            current_widget.refresh()
