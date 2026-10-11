"""Global QSS Styling for the 45 Engineering Tracker application."""

MODERN_STYLE_SHEET = """
QMainWindow {
    background-color: #0f172a;
}

QWidget {
    font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
    font-size: 13px;
    color: #f8fafc;
}

/* Sidebar Navigation */
#sidebar {
    background-color: #1e293b;
    border-right: 1px solid #334155;
    min-width: 240px;
    max-width: 260px;
}

#sidebarHeader {
    padding: 20px 16px;
    border-bottom: 1px solid #334155;
}

#appTitle {
    font-size: 18px;
    font-weight: 700;
    color: #38bdf8;
    letter-spacing: 0.5px;
}

#appSubtitle {
    font-size: 11px;
    color: #94a3b8;
    margin-top: 4px;
}

#navButton {
    background-color: transparent;
    border: none;
    border-radius: 8px;
    padding: 10px 14px;
    text-align: left;
    color: #cbd5e1;
    font-weight: 500;
    font-size: 13px;
    margin: 3px 10px;
}

#navButton:hover {
    background-color: #334155;
    color: #ffffff;
}

#navButton:checked {
    background-color: #0284c7;
    color: #ffffff;
    font-weight: 600;
}

/* Main Content Area */
#contentArea {
    background-color: #0f172a;
    padding: 24px;
}

#pageHeader {
    font-size: 20px;
    font-weight: 700;
    color: #f1f5f9;
    margin-bottom: 4px;
}

#pageSubheader {
    font-size: 13px;
    color: #94a3b8;
    margin-bottom: 16px;
}

/* Cards */
QFrame.card {
    background-color: #1e293b;
    border: 1px solid #334155;
    border-radius: 10px;
    padding: 16px;
}

#statCardTitle {
    font-size: 12px;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

#statCardValue {
    font-size: 26px;
    font-weight: 700;
    color: #f8fafc;
    margin: 4px 0px;
}

#statCardSubtitle {
    font-size: 11px;
    color: #64748b;
}

/* Data Tables */
QTableWidget {
    background-color: #1e293b;
    border: 1px solid #334155;
    border-radius: 8px;
    gridline-color: #334155;
    color: #f8fafc;
    selection-background-color: #0369a1;
    selection-color: #ffffff;
}

QHeaderView::section {
    background-color: #0f172a;
    color: #94a3b8;
    font-weight: 600;
    font-size: 12px;
    padding: 8px 12px;
    border: none;
    border-bottom: 2px solid #334155;
}

QTableWidget::item {
    padding: 8px 12px;
    border-bottom: 1px solid #334155;
}

QTableWidget::item:selected {
    background-color: #0284c7;
}

/* Buttons */
QPushButton {
    background-color: #0284c7;
    color: #ffffff;
    border: none;
    border-radius: 6px;
    padding: 8px 16px;
    font-weight: 600;
    font-size: 13px;
}

QPushButton:hover {
    background-color: #0369a1;
}

QPushButton:pressed {
    background-color: #075985;
}

QPushButton:disabled {
    background-color: #475569;
    color: #94a3b8;
}

QPushButton.secondary {
    background-color: #334155;
    color: #f8fafc;
}

QPushButton.secondary:hover {
    background-color: #475569;
}

QPushButton.success {
    background-color: #16a34a;
}

QPushButton.success:hover {
    background-color: #15803d;
}

QPushButton.danger {
    background-color: #dc2626;
}

QPushButton.danger:hover {
    background-color: #b91c1c;
}

/* Form Controls */
QLineEdit, QComboBox, QDateEdit, QSpinBox, QTextEdit {
    background-color: #0f172a;
    border: 1px solid #475569;
    border-radius: 6px;
    padding: 7px 10px;
    color: #f8fafc;
    font-size: 13px;
}

QLineEdit:focus, QComboBox:focus, QDateEdit:focus, QSpinBox:focus, QTextEdit:focus {
    border: 1px solid #38bdf8;
    background-color: #1e293b;
}

QComboBox::drop-down {
    border: none;
    padding-right: 8px;
}

QComboBox QAbstractItemView {
    background-color: #1e293b;
    border: 1px solid #475569;
    selection-background-color: #0284c7;
    color: #f8fafc;
}

QCheckBox {
    color: #f8fafc;
    spacing: 8px;
}

QCheckBox::indicator {
    width: 18px;
    height: 18px;
    border: 1px solid #475569;
    border-radius: 4px;
    background-color: #0f172a;
}

QCheckBox::indicator:checked {
    background-color: #0284c7;
    border-color: #38bdf8;
}

/* Scroll Bars */
QScrollBar:vertical {
    border: none;
    background-color: #0f172a;
    width: 8px;
    margin: 0px;
}

QScrollBar::handle:vertical {
    background-color: #475569;
    min-height: 24px;
    border-radius: 4px;
}

QScrollBar::handle:vertical:hover {
    background-color: #64748b;
}

QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {
    height: 0px;
}
"""
