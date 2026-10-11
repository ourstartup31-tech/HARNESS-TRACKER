"""Metric summary stat card widget."""
from PySide6.QtWidgets import QFrame, QVBoxLayout, QLabel
from PySide6.QtCore import Qt


class StatCard(QFrame):
    """Reusable card showing key metrics with bold numbers and accent highlights."""

    def __init__(
        self,
        title: str,
        value: str | int = "0",
        subtitle: str = "",
        accent_color: str = "#38bdf8",
        parent=None,
    ):
        super().__init__(parent)
        self.setObjectName("statCard")
        self.setProperty("class", "card")
        self.setStyleSheet(
            f"""
            QFrame#statCard {{
                background-color: #1e293b;
                border: 1px solid #334155;
                border-top: 3px solid {accent_color};
                border-radius: 8px;
                padding: 12px 16px;
            }}
            """
        )

        layout = QVBoxLayout(self)
        layout.setContentsMargins(12, 12, 12, 12)
        layout.setSpacing(4)

        self.title_label = QLabel(title.upper())
        self.title_label.setObjectName("statCardTitle")

        self.value_label = QLabel(str(value))
        self.value_label.setObjectName("statCardValue")
        self.value_label.setStyleSheet(f"font-size: 26px; font-weight: 700; color: {accent_color};")

        self.subtitle_label = QLabel(subtitle)
        self.subtitle_label.setObjectName("statCardSubtitle")

        layout.addWidget(self.title_label)
        layout.addWidget(self.value_label)
        layout.addWidget(self.subtitle_label)

    def set_value(self, value: str | int, subtitle: str | None = None) -> None:
        """Update value and optional subtitle."""
        self.value_label.setText(str(value))
        if subtitle is not None:
            self.subtitle_label.setText(subtitle)
