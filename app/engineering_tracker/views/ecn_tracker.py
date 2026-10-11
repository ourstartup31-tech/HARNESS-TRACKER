"""ECN Tracker generated view."""
from typing import List, Dict, Any, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.engineering_tracker.models.ecn import ECN
import pandas as pd


def get_ecn_tracker_view(session: Session, harness_id: Optional[int] = None) -> List[Dict[str, Any]]:
    """Generate the complete ECN Tracker tabular view from central records."""
    stmt = select(ECN).order_by(ECN.id.desc())
    if harness_id:
        stmt = stmt.where(ECN.harness_id == harness_id)

    ecns = session.execute(stmt).scalars().all()
    rows = []
    for ecn in ecns:
        harness = ecn.harness
        source_rev = ecn.source_revision
        new_rev = ecn.new_revision
        project = harness.project
        customer = project.customer

        rows.append(
            {
                "ecn_id": ecn.id,
                "ecn_number": ecn.ecn_number,
                "customer": customer.name,
                "model": project.model_name,
                "harness_number": harness.harness_number,
                "source_revision": source_rev.revision_code,
                "stage_context": ecn.stage_context,
                "development_type": ecn.development_type,
                "change_reason": ecn.change_reason,
                "revision_impact": ecn.revision_impact,
                "new_revision": new_rev.revision_code if new_rev else "-",
                "costing_required": "Yes" if ecn.costing_required else "No",
                "related_rfq": ecn.related_rfq.rfq_number if ecn.related_rfq else "-",
                "primary_engineer": ecn.primary_engineer.name,
                "support_engineer": ecn.support_engineer.name if ecn.support_engineer else "-",
                "design_input_date": str(ecn.design_input_date or "-"),
                "work_start_date": str(ecn.work_start_date or "-"),
                "target_date": str(ecn.target_date or "-"),
                "min_meeting_date": str(ecn.min_meeting_date or "-"),
                "completion_date": str(ecn.completion_date or "-"),
                "planned_duration_days": ecn.planned_duration if ecn.planned_duration is not None else "-",
                "actual_duration_days": ecn.actual_duration if ecn.actual_duration is not None else "-",
                "delay_days": ecn.delay_days,
                "delay_reason": ecn.delay_reason or "-",
                "ecn_status": ecn.ecn_status,
            }
        )
    return rows


def get_ecn_tracker_dataframe(session: Session, harness_id: Optional[int] = None) -> pd.DataFrame:
    """Return ECN Tracker as a Pandas DataFrame for analysis and reporting."""
    data = get_ecn_tracker_view(session, harness_id)
    return pd.DataFrame(data)
