"""Individual Project / Model Kit List generated view."""
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.engineering_tracker.services.dashboard_service import DashboardService
import pandas as pd


def get_project_kit_view(session: Session, project_id: int) -> List[Dict[str, Any]]:
    """Return Individual Project Kit List."""
    return DashboardService(session).get_individual_project_kit_data(project_id)


def get_project_kit_dataframe(session: Session, project_id: int) -> pd.DataFrame:
    """Return Project Kit List as a Pandas DataFrame."""
    data = get_project_kit_view(session, project_id)
    return pd.DataFrame(data)
