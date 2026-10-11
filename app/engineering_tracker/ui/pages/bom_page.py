"""BOM Upload and Release Tracker page."""
from PySide6.QtWidgets import (
    QWidget,
    QVBoxLayout,
    QHBoxLayout,
    QLabel,
    QPushButton,
    QMessageBox,
)
from sqlalchemy.orm import Session
from app.engineering_tracker.views.bom_tracker import get_bom_release_tracker_view
from app.engineering_tracker.ui.components.data_table import DataTableWidget
from app.engineering_tracker.ui.dialogs.bom_dialog import BOMUploadDialog, BOMReleaseDialog
from app.engineering_tracker.ui.dialogs.label_dialog import LabelUploadDialog, LabelHistoryDialog


class BOMPage(QWidget):
    """BOM Upload & Release Tracker page with label upload controls."""

    def __init__(self, session: Session, parent=None):
        super().__init__(parent)
        self.session = session

        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(14)

        # Header bar
        header_layout = QHBoxLayout()
        title_box = QVBoxLayout()
        header_lbl = QLabel("BOM Upload & Release Tracker")
        header_lbl.setObjectName("pageHeader")
        sub_lbl = QLabel("Manage SAP BOM alternates, release dates, and historical label uploads.")
        sub_lbl.setObjectName("pageSubheader")
        title_box.addWidget(header_lbl)
        title_box.addWidget(sub_lbl)
        header_layout.addLayout(title_box)

        header_layout.addStretch()

        self.upload_bom_btn = QPushButton("📦 Upload BOM")
        self.upload_bom_btn.clicked.connect(self._upload_bom)
        header_layout.addWidget(self.upload_bom_btn)

        self.release_bom_btn = QPushButton("✅ Release BOM")
        self.release_bom_btn.setProperty("class", "success")
        self.release_bom_btn.clicked.connect(self._release_bom)
        header_layout.addWidget(self.release_bom_btn)

        self.upload_label_btn = QPushButton("🏷️ Upload Label")
        self.upload_label_btn.setProperty("class", "secondary")
        self.upload_label_btn.clicked.connect(self._upload_label)
        header_layout.addWidget(self.upload_label_btn)

        self.history_label_btn = QPushButton("📜 Label History")
        self.history_label_btn.setProperty("class", "secondary")
        self.history_label_btn.clicked.connect(self._view_label_history)
        header_layout.addWidget(self.history_label_btn)

        self.refresh_btn = QPushButton("🔄 Refresh")
        self.refresh_btn.setProperty("class", "secondary")
        self.refresh_btn.clicked.connect(self.refresh)
        header_layout.addWidget(self.refresh_btn)

        layout.addLayout(header_layout)

        # Data Table
        columns = [
            "FG Code",
            "BOM Alt",
            "ECN Number",
            "Harness",
            "Cust Part No",
            "Cust Rev",
            "FG Rev",
            "Uploaded By",
            "Upload Date",
            "Release Date",
            "BOM Status",
            "Label Status",
            "Label Uploads",
        ]
        column_keys = [
            "fg_code",
            "bom_alternate",
            "ecn_number",
            "harness_number",
            "customer_part_number",
            "customer_revision",
            "fg_revision",
            "uploaded_by",
            "upload_date",
            "release_date",
            "bom_status",
            "label_status",
            "label_uploads_count",
        ]
        self.table_widget = DataTableWidget(columns, column_keys)
        self.table_widget.row_double_clicked.connect(self._on_row_double_clicked)
        layout.addWidget(self.table_widget)

        self.refresh()

    def refresh(self) -> None:
        """Reload BOM data."""
        data = get_bom_release_tracker_view(self.session)
        self.table_widget.set_data(data)

    def _upload_bom(self) -> None:
        dlg = BOMUploadDialog(self.session, parent=self)
        if dlg.exec():
            self.refresh()

    def _release_bom(self) -> None:
        row_data = self.table_widget.get_selected_row_data()
        if not row_data:
            QMessageBox.information(self, "Select Row", "Please select a BOM from the table to release.")
            return
        if row_data["release_date"] != "-":
            QMessageBox.information(self, "Already Released", f"This BOM was already released on {row_data['release_date']}.")
            return
        dlg = BOMReleaseDialog(self.session, bom_id=row_data["bom_id"], parent=self)
        if dlg.exec():
            self.refresh()

    def _upload_label(self) -> None:
        row_data = self.table_widget.get_selected_row_data()
        if not row_data:
            QMessageBox.information(self, "Select Row", "Please select a BOM from the table to upload a label.")
            return
        dlg = LabelUploadDialog(self.session, bom_id=row_data["bom_id"], parent=self)
        if dlg.exec():
            self.refresh()

    def _view_label_history(self) -> None:
        row_data = self.table_widget.get_selected_row_data()
        if not row_data:
            QMessageBox.information(self, "Select Row", "Please select a BOM to view its label history.")
            return
        dlg = LabelHistoryDialog(self.session, bom_id=row_data["bom_id"], parent=self)
        dlg.exec()

    def _on_row_double_clicked(self, row_data: dict) -> None:
        dlg = LabelHistoryDialog(self.session, bom_id=row_data["bom_id"], parent=self)
        dlg.exec()
