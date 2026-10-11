"""Tests for Project Dashboard metrics, Engineer Workload analytics, and Project Kit view."""
import pytest
from datetime import date, timedelta
from app.engineering_tracker.services.customer_service import CustomerService
from app.engineering_tracker.services.project_service import ProjectService
from app.engineering_tracker.services.harness_service import HarnessService
from app.engineering_tracker.services.revision_service import RevisionService
from app.engineering_tracker.services.engineer_service import EngineerService
from app.engineering_tracker.services.rfq_service import RFQService
from app.engineering_tracker.services.ecn_service import ECNService
from app.engineering_tracker.services.bom_service import BOMService
from app.engineering_tracker.services.label_service import LabelService
from app.engineering_tracker.services.min_service import MINService
from app.engineering_tracker.services.dashboard_service import DashboardService
from app.engineering_tracker.config import (
    STAGE_CONTEXT_SAMPLE,
    DEV_TYPE_NEW,
    ACTIVE_STATUS,
)


def test_project_dashboard_and_engineer_workload_metrics(session):
    customer = CustomerService(session).create_customer("Stellantis")
    project = ProjectService(session).get_or_create_project(customer.id, "Compass-2027")
    harness1 = HarnessService(session).create_harness(project.id, "HARN-CMP-01")
    harness2 = HarnessService(session).create_harness(project.id, "HARN-CMP-02")

    rev1 = RevisionService(session).create_revision(
        harness_id=harness1.id,
        revision_code="A",
        sop_number="SOP-01",
        volume=5000,
        circuit_count=30,
        status=ACTIVE_STATUS,
    )
    rev2 = RevisionService(session).create_revision(
        harness_id=harness2.id,
        revision_code="A",
        sop_number="SOP-02",
        volume=6000,
        circuit_count=35,
        status=ACTIVE_STATUS,
    )

    engineer = EngineerService(session).create_engineer("Marcus Vance")

    # Create RFQ
    rfq = RFQService(session).create_rfq(
        harness_id=harness1.id,
        revision_id=rev1.id,
        target_date=date.today() + timedelta(days=5),
    )

    # Create ECN 1 (In Progress)
    ecn1 = ECNService(session).create_ecn(
        harness_id=harness1.id,
        source_revision_id=rev1.id,
        stage_context=STAGE_CONTEXT_SAMPLE,
        development_type=DEV_TYPE_NEW,
        change_reason="Add fuse block",
        primary_engineer_id=engineer.id,
        work_start_date=date.today() - timedelta(days=2),
        target_date=date.today() + timedelta(days=5),
    )

    # Create BOM for ECN 1 (Unreleased)
    bom = BOMService(session).upload_bom(
        ecn_id=ecn1.id,
        fg_code="FG-CMP-01",
        customer_part_number="CPN-CMP-01",
        customer_revision="A",
        fg_revision="AA",
        uploaded_by_id=engineer.id,
    )

    dash_svc = DashboardService(session)

    # 1. Verify Project Dashboard Metrics
    proj_metrics = dash_svc.get_project_dashboard_metrics(project.id)
    assert proj_metrics["total_harnesses"] == 2
    assert proj_metrics["active_revisions"] == 2
    assert proj_metrics["open_rfqs"] == 1
    assert proj_metrics["open_ecns"] == 1
    assert proj_metrics["pending_bom_releases"] == 1
    assert proj_metrics["pending_labels"] == 0  # not released yet, so label isn't pending upload
    assert proj_metrics["min_completed"] == 0
    assert proj_metrics["min_pending"] == 1
    assert len(proj_metrics["harnesses"]) == 2

    # 2. Release BOM and check pending labels
    BOMService(session).release_bom(bom.id, release_date=date.today())
    proj_metrics2 = dash_svc.get_project_dashboard_metrics(project.id)
    assert proj_metrics2["pending_bom_releases"] == 0
    assert proj_metrics2["pending_labels"] == 1

    # 3. Verify Engineer Workload Metrics
    eng_metrics = dash_svc.get_engineer_workload_metrics(engineer.id)
    assert eng_metrics["engineer_name"] == "Marcus Vance"
    assert eng_metrics["open_ecns_count"] == 1
    assert eng_metrics["upcoming_ecns_count"] == 1
    assert eng_metrics["overdue_ecns_count"] == 0

    # 4. Verify Individual Project Kit List generation
    kit_rows = dash_svc.get_individual_project_kit_data(project.id)
    assert len(kit_rows) >= 2
    harn1_row = next(r for r in kit_rows if r["harness"] == "HARN-CMP-01")
    assert harn1_row["customer"] == "Stellantis"
    assert harn1_row["model"] == "Compass-2027"
    assert harn1_row["primary_engineer"] == "Marcus Vance"
    assert harn1_row["bom_fg"] == "FG-CMP-01"
    assert harn1_row["bom_status"] == "Released"
    assert harn1_row["label_status"] == "Not Uploaded"
