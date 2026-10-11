"""Audit mixin for model tracking."""
from datetime import datetime, timezone
from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column
from app.engineering_tracker.config import DEFAULT_USER


def utc_now() -> datetime:
    """Return current UTC datetime with naive format for SQLite compatibility."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class AuditMixin:
    """Audit fields for tracking entity creation and modifications."""

    created_by: Mapped[str] = mapped_column(
        String(100), default=DEFAULT_USER, nullable=False
    )
    created_date: Mapped[datetime] = mapped_column(
        DateTime, default=utc_now, nullable=False
    )
    modified_by: Mapped[str] = mapped_column(
        String(100), default=DEFAULT_USER, onupdate=DEFAULT_USER, nullable=False
    )
    modified_date: Mapped[datetime] = mapped_column(
        DateTime, default=utc_now, onupdate=utc_now, nullable=False
    )
