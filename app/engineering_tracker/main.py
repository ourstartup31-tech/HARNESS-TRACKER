"""Desktop Application Entry Point for 45 Engineering Tracker."""
import sys
from PySide6.QtWidgets import QApplication
from app.engineering_tracker.database.engine import init_db, get_engine
from app.engineering_tracker.database.session import get_session
from app.engineering_tracker.database.seed import seed_database_if_empty
from app.engineering_tracker.ui.main_window import MainWindow


def main() -> int:
    """Initialize database and launch the PySide6 desktop GUI."""
    # 1. Initialize Database Schema
    engine = get_engine()
    init_db(engine)

    # 2. Seed Initial Realistic Engineering Data if DB is empty
    session = get_session(engine)
    try:
        seed_database_if_empty(session)
    finally:
        session.close()

    # Check for headless test flag
    if "--check-only" in sys.argv:
        print("Database initialized and verified successfully.")
        return 0

    # 3. Launch PySide6 Desktop Application
    app = QApplication(sys.argv)
    app.setApplicationName("45 Engineering Tracker")
    app.setOrganizationName("45 Engineering")

    active_session = get_session(engine)
    window = MainWindow(active_session)
    window.show()

    return app.exec()


if __name__ == "__main__":
    sys.exit(main())
