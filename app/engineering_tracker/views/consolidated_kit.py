"""Consolidated Active Kit List generated view."""
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.engineering_tracker.services.kit_service import KitService
import pandas as pd


def get_consolidated_kit_view(session: Session) -> List[Dict[str, Any]]:
    """Return Consolidated Active Kit List."""
    return KitService(session).get_consolidated_active_kit_list()


def get_consolidated_kit_dataframe(session: Session) -> pd.DataFrame:
    """Return Consolidated Kit List as a Pandas DataFrame."""
    data = get_consolidated_kit_view(session)
    return pd.DataFrame(data)
