"""Engine setup and database initialization."""
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from app.engineering_tracker.config import DATABASE_URL
from app.engineering_tracker.database.base import Base


@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """Enforce foreign key constraints on SQLite connections."""
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


def get_engine(database_url: str | None = None) -> Engine:
    """Create and return an engine configured for the application."""
    url = database_url or DATABASE_URL
    connect_args = {}
    if url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
    return create_engine(url, connect_args=connect_args, echo=False)


def init_db(engine: Engine | None = None) -> None:
    """Create all tables in the database if they do not exist."""
    eng = engine or get_engine()
    # Import all models to ensure they register with Base.metadata
    import app.engineering_tracker.models  # noqa: F401

    Base.metadata.create_all(bind=eng)
