"""Pytest configuration and session fixtures."""
import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from app.engineering_tracker.database.base import Base
import app.engineering_tracker.models  # noqa: F401


@pytest.fixture(scope="session")
def engine():
    """Create in-memory SQLite engine for testing with foreign key checks."""
    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        echo=False,
    )

    @event.listens_for(test_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    return test_engine


@pytest.fixture(scope="function")
def tables(engine):
    """Create all tables before each test and drop them afterward."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def session(engine, tables):
    """Provide a clean database session for each test function."""
    connection = engine.connect()
    transaction = connection.begin()
    session_factory = sessionmaker(bind=connection, expire_on_commit=False)
    test_session: Session = session_factory()

    yield test_session

    test_session.close()
    if transaction.is_active:
        transaction.rollback()
    connection.close()
