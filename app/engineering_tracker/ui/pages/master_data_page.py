"""Master Data management page."""
from PySide6.QtWidgets import (
    QWidget,
    QVBoxLayout,
    QHBoxLayout,
    QTabWidget,
    QLabel,
    QPushButton,
    QTableWidget,
    QTableWidgetItem,
    QHeaderView,
    QMessageBox,
)
from PySide6.QtCore import Qt
from sqlalchemy.orm import Session
from app.engineering_tracker.services.customer_service import CustomerService
from app.engineering_tracker.services.engineer_service import EngineerService
from app.engineering_tracker.services.harness_service import HarnessService
from app.engineering_tracker.services.revision_service import RevisionService
from app.engineering_tracker.services.exceptions import (
    BusinessValidationError,
    ActiveRevisionConflictError,
)
from app.engineering_tracker.config import ACTIVE_STATUS, OBSOLETE_STATUS
from app.engineering_tracker.ui.dialogs.customer_dialog import CustomerDialog
from app.engineering_tracker.ui.dialogs.engineer_dialog import EngineerDialog
from app.engineering_tracker.ui.dialogs.harness_dialog import HarnessDialog
from app.engineering_tracker.ui.dialogs.revision_dialog import RevisionDialog


class MasterDataPage(QWidget):
    """Master Data management interface for Customers, Engineers, and Harness Revisions."""

    def __init__(self, session: Session, parent=None):
        super().__init__(parent)
        self.session = session
        self.customer_svc = CustomerService(session)
        self.engineer_svc = EngineerService(session)
        self.harness_svc = HarnessService(session)
        self.revision_svc = RevisionService(session)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(14)

        # Header bar
        header_layout = QHBoxLayout()
        title_box = QVBoxLayout()
        header_lbl = QLabel("Master Data Management")
        header_lbl.setObjectName("pageHeader")
        sub_lbl = QLabel("Manage customer masters, engineer allocation pools, and harness revision states.")
        sub_lbl.setObjectName("pageSubheader")
        title_box.addWidget(header_lbl)
        title_box.addWidget(sub_lbl)
        header_layout.addLayout(title_box)

        header_layout.addStretch()

        self.refresh_btn = QPushButton("🔄 Refresh All")
        self.refresh_btn.setProperty("class", "secondary")
        self.refresh_btn.clicked.connect(self.refresh)
        header_layout.addWidget(self.refresh_btn)

        layout.addLayout(header_layout)

        # Tabs
        self.tabs = QTabWidget()
        self.tabs.addTab(self._build_customers_tab(), "🏢 Customer Master")
        self.tabs.addTab(self._build_engineers_tab(), "👷 Engineer Master")
        self.tabs.addTab(self._build_harnesses_tab(), "⚡ Harnesses & Revisions")
        layout.addWidget(self.tabs)

        self.refresh()

    def _build_customers_tab(self) -> QWidget:
        widget = QWidget()
        layout = QVBoxLayout(widget)

        btn_bar = QHBoxLayout()
        self.add_cust_btn = QPushButton("➕ Add Customer")
        self.add_cust_btn.clicked.connect(self._add_customer)
        self.toggle_cust_btn = QPushButton("🔄 Toggle Active/Inactive")
        self.toggle_cust_btn.setProperty("class", "secondary")
        self.toggle_cust_btn.clicked.connect(self._toggle_customer_status)
        btn_bar.addWidget(self.add_cust_btn)
        btn_bar.addWidget(self.toggle_cust_btn)
        btn_bar.addStretch()
        layout.addLayout(btn_bar)

        self.cust_table = QTableWidget()
        self.cust_table.setColumnCount(4)
        self.cust_table.setHorizontalHeaderLabels(["ID", "Customer Name", "Active Status", "Projects Count"])
        self.cust_table.horizontalHeader().setStretchLastSection(True)
        self.cust_table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        layout.addWidget(self.cust_table)
        return widget

    def _build_engineers_tab(self) -> QWidget:
        widget = QWidget()
        layout = QVBoxLayout(widget)

        btn_bar = QHBoxLayout()
        self.add_eng_btn = QPushButton("➕ Add Engineer")
        self.add_eng_btn.clicked.connect(self._add_engineer)
        self.toggle_eng_btn = QPushButton("🔄 Toggle Active/Inactive")
        self.toggle_eng_btn.setProperty("class", "secondary")
        self.toggle_eng_btn.clicked.connect(self._toggle_engineer_status)
        btn_bar.addWidget(self.add_eng_btn)
        btn_bar.addWidget(self.toggle_eng_btn)
        btn_bar.addStretch()
        layout.addLayout(btn_bar)

        self.eng_table = QTableWidget()
        self.eng_table.setColumnCount(3)
        self.eng_table.setHorizontalHeaderLabels(["ID", "Engineer Name", "Active for Allocations"])
        self.eng_table.horizontalHeader().setStretchLastSection(True)
        self.eng_table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        layout.addWidget(self.eng_table)
        return widget

    def _build_harnesses_tab(self) -> QWidget:
        widget = QWidget()
        layout = QVBoxLayout(widget)

        btn_bar = QHBoxLayout()
        self.add_harn_btn = QPushButton("➕ Register New Harness")
        self.add_harn_btn.clicked.connect(self._add_harness)
        self.add_rev_btn = QPushButton("➕ Add Revision to Selected")
        self.add_rev_btn.setProperty("class", "secondary")
        self.add_rev_btn.clicked.connect(self._add_revision)
        self.toggle_rev_btn = QPushButton("🔄 Toggle Revision Active/Obsolete")
        self.toggle_rev_btn.setProperty("class", "secondary")
        self.toggle_rev_btn.clicked.connect(self._toggle_revision_status)

        btn_bar.addWidget(self.add_harn_btn)
        btn_bar.addWidget(self.add_rev_btn)
        btn_bar.addWidget(self.toggle_rev_btn)
        btn_bar.addStretch()
        layout.addLayout(btn_bar)

        self.harn_table = QTableWidget()
        self.harn_table.setColumnCount(7)
        self.harn_table.setHorizontalHeaderLabels([
            "Harness Number",
            "Customer",
            "Model",
            "Revision",
            "SOP Number",
            "Volume",
            "Status",
        ])
        self.harn_table.horizontalHeader().setStretchLastSection(True)
        self.harn_table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        layout.addWidget(self.harn_table)
        return widget

    def refresh(self) -> None:
        """Reload all tables."""
        # 1. Customers
        customers = self.customer_svc.list_customers(active_only=False)
        self.cust_table.setRowCount(len(customers))
        for row, c in enumerate(customers):
            item_id = QTableWidgetItem(str(c.id))
            item_id.setData(Qt.ItemDataRole.UserRole, c.id)
            self.cust_table.setItem(row, 0, item_id)
            self.cust_table.setItem(row, 1, QTableWidgetItem(c.name))
            self.cust_table.setItem(row, 2, QTableWidgetItem("Active" if c.is_active else "Inactive"))
            self.cust_table.setItem(row, 3, QTableWidgetItem(str(len(c.projects))))

        # 2. Engineers
        engineers = self.engineer_svc.list_engineers(active_only=False)
        self.eng_table.setRowCount(len(engineers))
        for row, e in enumerate(engineers):
            item_id = QTableWidgetItem(str(e.id))
            item_id.setData(Qt.ItemDataRole.UserRole, e.id)
            self.eng_table.setItem(row, 0, item_id)
            self.eng_table.setItem(row, 1, QTableWidgetItem(e.name))
            self.eng_table.setItem(row, 2, QTableWidgetItem("Active" if e.is_active else "Inactive"))

        # 3. Harnesses & Revisions
        harnesses = self.harness_svc.list_all_harnesses()
        rows = []
        for h in harnesses:
            for r in h.revisions:
                rows.append((h, r))

        self.harn_table.setRowCount(len(rows))
        for row_idx, (h, r) in enumerate(rows):
            item = QTableWidgetItem(h.harness_number)
            item.setData(Qt.ItemDataRole.UserRole, (h.id, r.id))
            self.harn_table.setItem(row_idx, 0, item)
            self.harn_table.setItem(row_idx, 1, QTableWidgetItem(h.project.customer.name))
            self.harn_table.setItem(row_idx, 2, QTableWidgetItem(h.project.model_name))
            self.harn_table.setItem(row_idx, 3, QTableWidgetItem(r.revision_code))
            self.harn_table.setItem(row_idx, 4, QTableWidgetItem(r.sop_number))
            self.harn_table.setItem(row_idx, 5, QTableWidgetItem(str(r.volume)))
            self.harn_table.setItem(row_idx, 6, QTableWidgetItem(r.status))

    def _add_customer(self) -> None:
        dlg = CustomerDialog(self.session, parent=self)
        if dlg.exec():
            self.refresh()

    def _toggle_customer_status(self) -> None:
        selected = self.cust_table.selectionModel().selectedRows()
        if not selected:
            QMessageBox.information(self, "Select Row", "Please select a customer to toggle status.")
            return
        row = selected[0].row()
        cust_id = self.cust_table.item(row, 0).data(Qt.ItemDataRole.UserRole)
        cust = self.customer_svc.get_customer_by_id(cust_id)
        new_status = not cust.is_active
        self.customer_svc.set_active_status(cust_id, new_status)
        self.session.commit()
        self.refresh()

    def _add_engineer(self) -> None:
        dlg = EngineerDialog(self.session, parent=self)
        if dlg.exec():
            self.refresh()

    def _toggle_engineer_status(self) -> None:
        selected = self.eng_table.selectionModel().selectedRows()
        if not selected:
            QMessageBox.information(self, "Select Row", "Please select an engineer to toggle status.")
            return
        row = selected[0].row()
        eng_id = self.eng_table.item(row, 0).data(Qt.ItemDataRole.UserRole)
        eng = self.engineer_svc.get_engineer_by_id(eng_id)
        new_status = not eng.is_active
        self.engineer_svc.set_active_status(eng_id, new_status)
        self.session.commit()
        self.refresh()

    def _add_harness(self) -> None:
        dlg = HarnessDialog(self.session, parent=self)
        if dlg.exec():
            self.refresh()

    def _add_revision(self) -> None:
        selected = self.harn_table.selectionModel().selectedRows()
        if not selected:
            QMessageBox.information(self, "Select Row", "Please select a harness row to add a revision.")
            return
        row = selected[0].row()
        harness_id, _ = self.harn_table.item(row, 0).data(Qt.ItemDataRole.UserRole)
        dlg = RevisionDialog(self.session, harness_id=harness_id, parent=self)
        if dlg.exec():
            self.refresh()

    def _toggle_revision_status(self) -> None:
        selected = self.harn_table.selectionModel().selectedRows()
        if not selected:
            QMessageBox.information(self, "Select Row", "Please select a revision row to toggle status.")
            return
        row = selected[0].row()
        harness_id, revision_id = self.harn_table.item(row, 0).data(Qt.ItemDataRole.UserRole)
        rev = self.revision_svc.get_revision_by_id(revision_id)

        target_status = OBSOLETE_STATUS if rev.status == ACTIVE_STATUS else ACTIVE_STATUS
        try:
            self.revision_svc.set_revision_status(revision_id, target_status)
            self.session.commit()
            self.refresh()
        except ActiveRevisionConflictError as e:
            self.session.rollback()
            QMessageBox.critical(self, "Poka-Yoke: Single Active Revision Rule", e.message)
        except BusinessValidationError as e:
            self.session.rollback()
            QMessageBox.warning(self, "Validation Error", e.message)
