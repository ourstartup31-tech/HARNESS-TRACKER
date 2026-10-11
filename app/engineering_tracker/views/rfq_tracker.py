"""RFQ Tracker generated view."""
from typing import List, Dict, Any, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.engineering_tracker.models.rfq import RFQ
import pandas as pd


def get_rfq_tracker_view(session: Session, harness_id: Optional[int] = None) -> List[Dict[str, Any]]:
    """Generate the complete RFQ Tracker tabular view from central normalized records."""
    stmt = select(RFQ).order_by(RFQ.id.desc())
    if harness_id:
        stmt = stmt.where(RFQ.harness_id == harness_id)

    rfqs = session.execute(stmt).scalars().all()
    rows = []
    for rfq in rfqs:
        harness = rfq.harness
        rev = rfq.revision
        project = harness.project
        customer = project.customer

        rows.append(
            {
                "rfq_id": rfq.id,
                "rfq_number": rfq.rfq_number,
                "customer": customer.name,
                "model": project.model_name,
                "harness_number": harness.harness_number,
                "revision": rev.revision_code,
                "sop_number": rev.sop_number,
                "circuit_count": rev.circuit_count,
                "marketing_input_date": str(rfq.marketing_input_date or "-"),
                "design_input_date": str(rfq.design_input_date or "-"),
                "work_start_date": str(rfq.work_start_date or "-"),
                "target_date": str(rfq.target_date or "-"),
                "costing_bom_submitted_date": str(rfq.costing_bom_submitted_date or "-"),
                "query_yes_no": "Yes" if rfq.query_yes_no else "No",
                "query_status": rfq.query_status or "-",
                "proposal_yes_no": "Yes" if rfq.proposal_yes_no else "No",
                "proposal_status": rfq.proposal_status or "-",
                "overall_status": rfq.overall_rfq_status,
            }
        )
    return rows


def get_rfq_tracker_dataframe(session: Session, harness_id: Optional[int] = None) -> pd.DataFrame:
    """Return RFQ Tracker as a Pandas DataFrame for analysis and reporting."""
    data = get_rfq_tracker_view(session, harness_id)
    return pd.DataFrame(data)
