"""Harness Revision History generated view."""
from typing import List, Dict, Any
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.engineering_tracker.models.harness import Harness
import pandas as pd


def get_harness_revision_history(session: Session, harness_id: int) -> List[Dict[str, Any]]:
    """Generate the complete historical revision timeline for a Harness."""
    harness = session.get(Harness, harness_id)
    if not harness:
        return []

    rows = []
    for rev in harness.revisions:
        # Related ECNs for this revision
        ecns = [e.ecn_number for e in rev.source_ecns + rev.new_ecns]
        rfqs = [r.rfq_number for r in rev.rfqs]

        rows.append(
            {
                "harness_number": harness.harness_number,
                "revision_code": rev.revision_code,
                "sop_number": rev.sop_number,
                "volume": rev.volume,
                "circuit_count": rev.circuit_count,
                "status": rev.status,
                "created_date": str(rev.created_date.date() if rev.created_date else "-"),
                "created_by": rev.created_by,
                "related_ecns": ", ".join(ecns) if ecns else "-",
                "related_rfqs": ", ".join(rfqs) if rfqs else "-",
            }
        )
    return rows


def get_harness_history_dataframe(session: Session, harness_id: int) -> pd.DataFrame:
    """Return Harness Revision History as a Pandas DataFrame."""
    data = get_harness_revision_history(session, harness_id)
    return pd.DataFrame(data)
