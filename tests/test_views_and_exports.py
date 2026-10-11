"""Tests for generated views, pandas dataframes, and Excel export."""
from datetime import date
from pathlib import Path
from app.engineering_tracker.services.customer_service import CustomerService
from app.engineering_tracker.services.project_service import ProjectService
from app.engineering_tracker.services.harness_service import HarnessService
from app.engineering_tracker.services.revision_service import RevisionService
from app.engineering_tracker.services.engineer_service import EngineerService
from app.engineering_tracker.services.rfq_service import RFQService
from app.engineering_tracker.services.ecn_service import ECNService
from app.engineering_tracker.services.bom_service import BOMService
from app.engineering_tracker.views.rfq_tracker import get_rfq_tracker_view, get_rfq_tracker_dataframe
from app.engineering_tracker.views.ecn_tracker import get_ecn_tracker_view, get_ecn_tracker_dataframe
from app.engineering_tracker.views.bom_tracker import get_bom_release_tracker_view
from app.engineering_tracker.views.harness_history import get_harness_revision_history
from app.engineering_tracker.utils.export import export_to_excel, export_to_csv
from app.engineering_tracker.config import STAGE_CONTEXT_SAMPLE, DEV_TYPE_NEW


def test_generated_views_and_exports(session, tmp_path):
    customer = CustomerService(session).create_customer("Mahindra Aero")
    project = ProjectService(session).get_or_create_project(customer.id, "Thar-EV")
    harness = HarnessService(session).create_harness(project.id, "HARN-THAR-01")
    rev = RevisionService(session).create_revision(
        harness_id=harness.id,
        revision_code="A",
        sop_number="SOP-THAR-01",
        volume=5000,
        circuit_count=40,
    )
    eng = EngineerService(session).create_engineer("Vikram Rao")

    rfq = RFQService(session).create_rfq(harness_id=harness.id, revision_id=rev.id)
    ecn = ECNService(session).create_ecn(
        harness_id=harness.id,
        source_revision_id=rev.id,
        stage_context=STAGE_CONTEXT_SAMPLE,
        development_type=DEV_TYPE_NEW,
        change_reason="Export view test",
        primary_engineer_id=eng.id,
        target_date=date(2026, 7, 1),
    )
    bom = BOMService(session).upload_bom(
        ecn_id=ecn.id,
        fg_code="FG-THAR-01",
        customer_part_number="CPN-THAR-01",
        customer_revision="A",
        fg_revision="AA",
        uploaded_by_id=eng.id,
        upload_date=date(2026, 6, 1),
    )

    # 1. RFQ View
    rfq_rows = get_rfq_tracker_view(session)
    assert len(rfq_rows) == 1
    assert rfq_rows[0]["rfq_number"] == rfq.rfq_number
    rfq_df = get_rfq_tracker_dataframe(session)
    assert len(rfq_df) == 1

    # 2. ECN View
    ecn_rows = get_ecn_tracker_view(session)
    assert len(ecn_rows) == 1
    assert ecn_rows[0]["ecn_number"] == ecn.ecn_number

    # 3. BOM View
    bom_rows = get_bom_release_tracker_view(session)
    assert len(bom_rows) == 1
    assert bom_rows[0]["fg_code"] == "FG-THAR-01"

    # 4. Harness History View
    history_rows = get_harness_revision_history(session, harness.id)
    assert len(history_rows) == 1
    assert history_rows[0]["revision_code"] == "A"

    # 5. Export to Excel
    excel_path = tmp_path / "test_rfq_export.xlsx"
    res_path = export_to_excel(rfq_rows, excel_path, sheet_name="RFQ Tracker")
    assert res_path.exists()
    assert res_path.stat().st_size > 0

    # 6. Export to CSV
    csv_path = tmp_path / "test_ecn_export.csv"
    res_csv = export_to_csv(ecn_rows, csv_path)
    assert res_csv.exists()
    assert res_csv.stat().st_size > 0
