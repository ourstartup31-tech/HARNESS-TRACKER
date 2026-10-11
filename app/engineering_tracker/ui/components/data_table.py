"""Reusable searchable and exportable data table component."""
from typing import List, Dict, Any, Callable, Optional
from pathlib import Path
from PySide6.QtWidgets import (
    QWidget,
    QVBoxLayout,
    QHBoxLayout,
    QLineEdit,
    QPushButton,
    QTableWidget,
    QTableWidgetItem,
    QHeaderView,
    QLabel,
    QFileDialog,
    QMessageBox,
)
from PySide6.QtCore import Qt, Signal
from app.engineering_tracker.utils.export import export_to_excel


class DataTableWidget(QWidget):
    """Reusable table widget equipped with search filtering and Excel export."""

    row_double_clicked = Signal(dict)

    def __init__(
        self,
        columns: List[str],
        column_keys: List[str],
        parent=None,
    ):
        super().__init__(parent)
        self.columns = columns
        self.column_keys = column_keys
        self.raw_data: List[Dict[str, Any]] = []

        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(10)

        # Top Bar: Search + Export
        top_bar = QHBoxLayout()
        top_bar.setSpacing(12)

        self.search_input = QLineEdit()
        self.search_input.setPlaceholderText("🔍 Filter records...")
        self.search_input.textChanged.connect(self._filter_data)
        top_bar.addWidget(self.search_input, stretch=3)

        self.count_label = QLabel("0 records")
        self.count_label.setStyleSheet("color: #94a3b8; font-weight: 500;")
        top_bar.addWidget(self.count_label)

        self.export_btn = QPushButton("📥 Export Excel")
        self.export_btn.setProperty("class", "secondary")
        self.export_btn.clicked.connect(self._export_to_excel)
        top_bar.addWidget(self.export_btn)

        layout.addLayout(top_bar)

        # Table
        self.table = QTableWidget()
        self.table.setColumnCount(len(columns))
        self.table.setHorizontalHeaderLabels(columns)
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Interactive)
        self.table.horizontalHeader().setStretchLastSection(True)
        self.table.verticalHeader().setVisible(False)
        self.table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        self.table.setSelectionMode(QTableWidget.SelectionMode.SingleSelection)
        self.table.setEditTriggers(QTableWidget.EditTrigger.NoEditTriggers)
        self.table.setAlternatingRowColors(True)
        self.table.cellDoubleClicked.connect(self._on_cell_double_clicked)

        layout.addWidget(self.table)

    def set_data(self, data: List[Dict[str, Any]]) -> None:
        """Populate table with records."""
        self.raw_data = data
        self._filter_data(self.search_input.text())

    def _filter_data(self, query: str) -> None:
        """Filter table rows based on query."""
        clean_q = (query or "").strip().lower()
        filtered = []
        for item in self.raw_data:
            if not clean_q:
                filtered.append(item)
            else:
                row_text = " ".join(str(v) for v in item.values()).lower()
                if clean_q in row_text:
                    filtered.append(item)

        self.table.setRowCount(len(filtered))
        for row_idx, row_dict in enumerate(filtered):
            for col_idx, col_key in enumerate(self.column_keys):
                val = row_dict.get(col_key, "")
                item = QTableWidgetItem(str(val) if val is not None else "")
                item.setData(Qt.ItemDataRole.UserRole, row_dict)
                self.table.setItem(row_idx, col_idx, item)

        self.count_label.setText(f"{len(filtered)} records")

    def _on_cell_double_clicked(self, row: int, col: int) -> None:
        item = self.table.item(row, 0)
        if item:
            data = item.data(Qt.ItemDataRole.UserRole)
            if data:
                self.row_double_clicked.emit(data)

    def get_selected_row_data(self) -> Optional[Dict[str, Any]]:
        """Return data dictionary of currently selected row."""
        selected_indexes = self.table.selectionModel().selectedRows()
        if not selected_indexes:
            return None
        row = selected_indexes[0].row()
        item = self.table.item(row, 0)
        if item:
            return item.data(Qt.ItemDataRole.UserRole)
        return None

    def _export_to_excel(self) -> None:
        """Export current data to an Excel file chosen by user."""
        if not self.raw_data:
            QMessageBox.information(self, "Export", "No data to export.")
            return

        file_path, _ = QFileDialog.getSaveFileName(
            self,
            "Save Excel Workbook",
            "export.xlsx",
            "Excel Files (*.xlsx)",
        )
        if file_path:
            try:
                export_to_excel(self.raw_data, file_path)
                QMessageBox.information(
                    self, "Export Succeeded", f"Data exported successfully to:\n{file_path}"
                )
            except Exception as e:
                QMessageBox.critical(self, "Export Error", f"Failed to export Excel:\n{e}")
