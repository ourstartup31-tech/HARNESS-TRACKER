"""BOM Upload/Release and Label History generated view."""
from typing import List, Dict, Any, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.engineering_tracker.models.bom import BOMRecord
import pandas as pd


def get_bom_release_tracker_view(session: Session, ecn_id: Optional[int] = None) -> List[Dict[str, Any]]:
    """Generate the BOM Upload and Release Tracker view."""
    stmt = select(BOMRecord).order_by(BOMRecord.id.desc())
    if ecn_id:
        stmt = stmt.where(BOMRecord.ecn_id == ecn_id)

    boms = session.execute(stmt).scalars().all()
    rows = []
    for bom in boms:
        ecn = bom.ecn
        harness = ecn.harness

        rows.append(
            {
                "bom_id": bom.id,
                "ecn_number": ecn.ecn_number,
                "harness_number": harness.harness_number,
                "fg_code": bom.fg_code,
                "bom_alternate": bom.bom_alternate,
                "customer_part_number": bom.customer_part_number,
                "customer_revision": bom.customer_revision,
                "fg_revision": bom.fg_revision,
                "uploaded_by": bom.uploaded_by.name if bom.uploaded_by else "-",
                "upload_date": str(bom.upload_date or "-"),
                "release_date": str(bom.release_date or "-"),
                "bom_status": bom.bom_status,
                "label_status": bom.label_status,
                "label_uploads_count": len(bom.labels),
            }
        )
    return rows


def get_bom_release_dataframe(session: Session, ecn_id: Optional[int] = None) -> pd.DataFrame:
    """Return BOM Tracker as a Pandas DataFrame."""
    data = get_bom_release_tracker_view(session, ecn_id)
    return pd.DataFrame(data)
