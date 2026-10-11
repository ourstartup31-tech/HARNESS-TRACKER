"""Headless UI tests verifying widget creation, navigation, and dialogs."""
import os
import pytest
from PySide6.QtWidgets import QApplication

# Run headless without opening actual display windows
os.environ["QT_QPA_PLATFORM"] = "offscreen"


@pytest.fixture(scope="session")
def qapp():
    """Ensure a single QApplication instance exists for the test session."""
    app = QApplication.instance()
    if app is None:
        app = QApplication([])
    return app


def test_main_window_instantiation_and_navigation(qapp, session):
    from app.engineering_tracker.database.seed import seed_database_if_empty
    from app.engineering_tracker.ui.main_window import MainWindow

    seed_database_if_empty(session)

    window = MainWindow(session)
    assert window.windowTitle().startswith("45 Engineering Tracker")
    assert window.stack.count() == 8

    # Test navigating through each tab
    for i in range(8):
        window.nav_buttons[i].click()
        assert window.stack.currentIndex() == i

    window.close()


def test_dialogs_instantiation(qapp, session):
    from app.engineering_tracker.ui.dialogs.customer_dialog import CustomerDialog
    from app.engineering_tracker.ui.dialogs.engineer_dialog import EngineerDialog
    from app.engineering_tracker.ui.dialogs.harness_dialog import HarnessDialog

    cust_dlg = CustomerDialog(session)
    assert cust_dlg is not None
    cust_dlg.close()

    eng_dlg = EngineerDialog(session)
    assert eng_dlg is not None
    eng_dlg.close()

    harn_dlg = HarnessDialog(session)
    assert harn_dlg is not None
    harn_dlg.close()
