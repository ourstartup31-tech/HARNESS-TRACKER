"""Session factory and context management."""
from contextlib import contextmanager
from typing import Generator
from sqlalchemy.orm import sessionmaker, Session
from app.engineering_tracker.database.engine import get_engine

_session_factory = None


def get_session_factory(engine=None) -> sessionmaker[Session]:
    """Get or initialize the sessionmaker."""
    global _session_factory
    if _session_factory is None or engine is not None:
        eng = engine or get_engine()
        _session_factory = sessionmaker(bind=eng, expire_on_commit=False)
    return _session_factory


def get_session(engine=None) -> Session:
    """Create a new database session."""
    factory = get_session_factory(engine)
    return factory()


@contextmanager
def session_scope(session: Session | None = None) -> Generator[Session, None, None]:
    """Provide a transactional scope around a series of operations."""
    if session is not None:
        yield session
    else:
        new_session = get_session()
        try:
            yield new_session
            new_session.commit()
        except Exception:
            new_session.rollback()
            raise
        finally:
            new_session.close()
