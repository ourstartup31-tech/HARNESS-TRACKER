"""Excel and CSV export utilities."""
from pathlib import Path
from typing import List, Dict, Any, Union
import pandas as pd


def export_to_excel(
    data: Union[List[Dict[str, Any]], pd.DataFrame],
    file_path: Union[str, Path],
    sheet_name: str = "Sheet1",
) -> Path:
    """Export list of dictionaries or DataFrame to an Excel .xlsx workbook."""
    path = Path(file_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    df = data if isinstance(data, pd.DataFrame) else pd.DataFrame(data)

    with pd.ExcelWriter(path, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name=sheet_name, index=False)

    return path


def export_to_csv(
    data: Union[List[Dict[str, Any]], pd.DataFrame],
    file_path: Union[str, Path],
) -> Path:
    """Export list of dictionaries or DataFrame to a CSV file."""
    path = Path(file_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    df = data if isinstance(data, pd.DataFrame) else pd.DataFrame(data)
    df.to_csv(path, index=False)
    return path
