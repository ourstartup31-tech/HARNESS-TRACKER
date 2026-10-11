"""Engineer master model."""
from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column
from app.engineering_tracker.database.base import Base
from app.engineering_tracker.models.audit import AuditMixin


class Engineer(Base, AuditMixin):
    """Engineer entity representation for task allocation."""

    __tablename__ = "engineers"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    def __repr__(self) -> str:
        return f"<Engineer(id={self.id}, name='{self.name}', active={self.is_active})>"
