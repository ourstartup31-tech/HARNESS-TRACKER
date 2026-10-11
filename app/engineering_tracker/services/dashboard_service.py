"""Dashboard and generated view service for real-time project and engineer analytics."""
from datetime import date
from typing import Dict, Any, List, Optional
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.engineering_tracker.models.customer import Customer
from app.engineering_tracker.models.project import Project
from app.engineering_tracker.models.harness import Harness
from app.engineering_tracker.models.revision import Revision
from app.engineering_tracker.models.rfq import RFQ
from app.engineering_tracker.models.ecn import ECN
from app.engineering_tracker.models.bom import BOMRecord
from app.engineering_tracker.models.label_upload import LabelUpload
from app.engineering_tracker.models.engineer import Engineer
from app.engineering_tracker.config import (
    ACTIVE_STATUS,
    ECN_STATUS_COMPLETED,
    ECN_STATUS_CANCELLED,
    RFQ_STATUS_COMPLETED,
    RFQ_STATUS_CANCELLED,
)


class DashboardService:
    """Service providing aggregated metrics and generated views for Projects and Engineers."""

    def __init__(self, session: Session):
        self.session = session

    def get_project_dashboard_metrics(self, project_id: int) -> Dict[str, Any]:
        """Compute real-time summary indicators for a Model/Project."""
        project = self.session.get(Project, project_id)
        if not project:
            return {}

        harness_ids = [h.id for h in project.harnesses]
        if not harness_ids:
            return {
                "project_id": project.id,
                "customer_name": project.customer.name,
                "model_name": project.model_name,
                "total_harnesses": 0,
                "active_revisions": 0,
                "open_rfqs": 0,
                "open_ecns": 0,
                "pending_bom_releases": 0,
                "pending_labels": 0,
                "min_completed": 0,
                "min_pending": 0,
                "delayed_ecns": 0,
                "harnesses": [],
            }

        today = date.today()

        # Active Revisions
        stmt_revs = (
            select(func.count(Revision.id))
            .where(Revision.harness_id.in_(harness_ids))
            .where(Revision.status == ACTIVE_STATUS)
        )
        active_revs = self.session.execute(stmt_revs).scalar() or 0

        # Open RFQs
        stmt_rfqs = (
            select(func.count(RFQ.id))
            .where(RFQ.harness_id.in_(harness_ids))
            .where(RFQ.overall_rfq_status.not_in([RFQ_STATUS_COMPLETED, RFQ_STATUS_CANCELLED]))
        )
        open_rfqs = self.session.execute(stmt_rfqs).scalar() or 0

        # ECNs
        stmt_ecns = (
            select(ECN)
            .where(ECN.harness_id.in_(harness_ids))
        )
        ecns = list(self.session.execute(stmt_ecns).scalars().all())

        open_ecns = sum(
            1 for e in ecns if e.ecn_status not in [ECN_STATUS_COMPLETED, ECN_STATUS_CANCELLED]
        )
        min_completed = sum(1 for e in ecns if e.min_meeting_date is not None)
        min_pending = sum(
            1 for e in ecns if e.min_meeting_date is None and e.ecn_status != ECN_STATUS_CANCELLED
        )

        delayed_ecns = 0
        for e in ecns:
            if e.min_meeting_date and e.target_date and e.min_meeting_date > e.target_date:
                delayed_ecns += 1
            elif not e.min_meeting_date and e.target_date and e.target_date < today:
                delayed_ecns += 1

        # BOMs & Labels
        ecn_ids = [e.id for e in ecns]
        pending_bom_releases = 0
        pending_labels = 0
        if ecn_ids:
            stmt_boms = select(BOMRecord).where(BOMRecord.ecn_id.in_(ecn_ids))
            boms = list(self.session.execute(stmt_boms).scalars().all())
            pending_bom_releases = sum(1 for b in boms if b.release_date is None)
            pending_labels = sum(1 for b in boms if b.release_date is not None and len(b.labels) == 0)

        # Harness details summary
        harness_summaries = []
        for h in project.harnesses:
            act_rev = next((r.revision_code for r in h.revisions if r.status == ACTIVE_STATUS), "None")
            harness_summaries.append(
                {
                    "harness_id": h.id,
                    "harness_number": h.harness_number,
                    "total_revisions": len(h.revisions),
                    "active_revision": act_rev,
                    "total_rfqs": len(h.rfqs),
                    "total_ecns": len(h.ecns),
                }
            )

        return {
            "project_id": project.id,
            "customer_name": project.customer.name,
            "model_name": project.model_name,
            "total_harnesses": len(project.harnesses),
            "active_revisions": active_revs,
            "open_rfqs": open_rfqs,
            "open_ecns": open_ecns,
            "pending_bom_releases": pending_bom_releases,
            "pending_labels": pending_labels,
            "min_completed": min_completed,
            "min_pending": min_pending,
            "delayed_ecns": delayed_ecns,
            "harnesses": harness_summaries,
        }

    def get_engineer_workload_metrics(self, engineer_id: int) -> Dict[str, Any]:
        """Compute real-time workload, durations, upcoming targets, and overdue work for an engineer."""
        engineer = self.session.get(Engineer, engineer_id)
        if not engineer:
            return {}

        today = date.today()

        stmt_ecns = (
            select(ECN)
            .where(
                (ECN.primary_engineer_id == engineer_id)
                | (ECN.support_engineer_id == engineer_id)
            )
            .order_by(ECN.target_date.asc())
        )
        ecns = list(self.session.execute(stmt_ecns).scalars().all())

        open_ecns = [
            e for e in ecns if e.ecn_status not in [ECN_STATUS_COMPLETED, ECN_STATUS_CANCELLED]
        ]
        completed_ecns = [e for e in ecns if e.ecn_status == ECN_STATUS_COMPLETED]

        overdue_ecns = [
            e for e in open_ecns if e.target_date and e.target_date < today
        ]

        upcoming_ecns = [
            e for e in open_ecns if e.target_date and 0 <= (e.target_date - today).days <= 14
        ]

        # Duration analysis
        planned_durations = [e.planned_duration for e in completed_ecns if e.planned_duration is not None]
        actual_durations = [e.actual_duration for e in completed_ecns if e.actual_duration is not None]
        avg_planned = (sum(planned_durations) / len(planned_durations)) if planned_durations else 0.0
        avg_actual = (sum(actual_durations) / len(actual_durations)) if actual_durations else 0.0

        # Project breakdown
        project_counts: Dict[str, int] = {}
        for e in open_ecns:
            proj_name = f"{e.harness.project.customer.name} - {e.harness.project.model_name}"
            project_counts[proj_name] = project_counts.get(proj_name, 0) + 1

        return {
            "engineer_id": engineer.id,
            "engineer_name": engineer.name,
            "is_active": engineer.is_active,
            "total_assigned_ecns": len(ecns),
            "open_ecns_count": len(open_ecns),
            "completed_ecns_count": len(completed_ecns),
            "overdue_ecns_count": len(overdue_ecns),
            "upcoming_ecns_count": len(upcoming_ecns),
            "avg_planned_duration_days": round(avg_planned, 1),
            "avg_actual_duration_days": round(avg_actual, 1),
            "project_distribution": project_counts,
            "open_ecns": open_ecns,
            "overdue_ecns": overdue_ecns,
            "upcoming_ecns": upcoming_ecns,
        }

    def get_individual_project_kit_data(self, project_id: int) -> List[Dict[str, Any]]:
        """
        Generate Individual Project Kit List aggregating the complete engineering lifecycle:
        RFQ activity, ECNs, NPD/Production context, Revisions, Engineers, BOM, Labels, MIN, Storage.
        """
        project = self.session.get(Project, project_id)
        if not project:
            return []

        rows = []
        for harness in project.harnesses:
            for rev in harness.revisions:
                # Find matching RFQs
                rfqs_for_rev = [r for r in harness.rfqs if r.revision_id == rev.id]
                # Find matching ECNs
                ecns_for_rev = [
                    e
                    for e in harness.ecns
                    if e.source_revision_id == rev.id or e.new_revision_id == rev.id
                ]

                if not ecns_for_rev and not rfqs_for_rev:
                    # Harness & Revision with no active transactions
                    rows.append(
                        {
                            "customer": project.customer.name,
                            "model": project.model_name,
                            "harness": harness.harness_number,
                            "revision": rev.revision_code,
                            "sop": rev.sop_number,
                            "volume": rev.volume,
                            "circuits": rev.circuit_count,
                            "rfq_number": "-",
                            "rfq_status": "-",
                            "costing_bom_date": "-",
                            "ecn_number": "-",
                            "stage_context": "-",
                            "primary_engineer": "-",
                            "target_date": "-",
                            "min_date": "-",
                            "bom_fg": "-",
                            "bom_alt": "-",
                            "bom_status": "-",
                            "label_status": "-",
                            "rack_number": "-",
                            "file_number": "-",
                        }
                    )
                    continue

                for ecn in ecns_for_rev or [None]:
                    rfq_ref = ecn.related_rfq if ecn and ecn.related_rfq else (rfqs_for_rev[0] if rfqs_for_rev else None)
                    boms = ecn.boms if ecn else []
                    kit = ecn.kit_entry if ecn else None

                    if not boms:
                        rows.append(
                            {
                                "customer": project.customer.name,
                                "model": project.model_name,
                                "harness": harness.harness_number,
                                "revision": rev.revision_code,
                                "sop": rev.sop_number,
                                "volume": rev.volume,
                                "circuits": rev.circuit_count,
                                "rfq_number": rfq_ref.rfq_number if rfq_ref else "-",
                                "rfq_status": rfq_ref.overall_rfq_status if rfq_ref else "-",
                                "costing_bom_date": str(rfq_ref.costing_bom_submitted_date) if rfq_ref and rfq_ref.costing_bom_submitted_date else "-",
                                "ecn_number": ecn.ecn_number if ecn else "-",
                                "stage_context": ecn.stage_context if ecn else "-",
                                "primary_engineer": ecn.primary_engineer.name if ecn else "-",
                                "target_date": str(ecn.target_date) if ecn and ecn.target_date else "-",
                                "min_date": str(ecn.min_meeting_date) if ecn and ecn.min_meeting_date else "-",
                                "bom_fg": "-",
                                "bom_alt": "-",
                                "bom_status": "-",
                                "label_status": "-",
                                "rack_number": kit.rack_number if kit and kit.rack_number else "-",
                                "file_number": kit.file_number if kit and kit.file_number else "-",
                            }
                        )
                    else:
                        for bom in boms:
                            rows.append(
                                {
                                    "customer": project.customer.name,
                                    "model": project.model_name,
                                    "harness": harness.harness_number,
                                    "revision": rev.revision_code,
                                    "sop": rev.sop_number,
                                    "volume": rev.volume,
                                    "circuits": rev.circuit_count,
                                    "rfq_number": rfq_ref.rfq_number if rfq_ref else "-",
                                    "rfq_status": rfq_ref.overall_rfq_status if rfq_ref else "-",
                                    "costing_bom_date": str(rfq_ref.costing_bom_submitted_date) if rfq_ref and rfq_ref.costing_bom_submitted_date else "-",
                                    "ecn_number": ecn.ecn_number if ecn else "-",
                                    "stage_context": ecn.stage_context if ecn else "-",
                                    "primary_engineer": ecn.primary_engineer.name if ecn else "-",
                                    "target_date": str(ecn.target_date) if ecn and ecn.target_date else "-",
                                    "min_date": str(ecn.min_meeting_date) if ecn and ecn.min_meeting_date else "-",
                                    "bom_fg": bom.fg_code,
                                    "bom_alt": bom.bom_alternate,
                                    "bom_status": bom.bom_status,
                                    "label_status": bom.label_status,
                                    "rack_number": kit.rack_number if kit and kit.rack_number else "-",
                                    "file_number": kit.file_number if kit and kit.file_number else "-",
                                }
                            )
        return rows
