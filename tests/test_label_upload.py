"""Tests for Label Upload history, blocking before BOM release, and derived label status."""
import pytest
from datetime import date
from app.engineering_tracker.services.customer_service import CustomerService
from app.engineering_tracker.services.project_service import ProjectService
from app.engineering_tracker.services.harness_service import HarnessService
from app.engineering_tracker.services.revision_service import RevisionService
from app.engineering_tracker.services.engineer_service import EngineerService
from app.engineering_tracker.services.ecn_service import ECNService
from app.engineering_tracker.services.bom_service import BOMService
from app.engineering_tracker.services.label_service import LabelService
from app.engineering_tracker.services.exceptions import (
    PrematureLabelUploadError,
    BusinessValidationError,
)
from app.engineering_tracker.config import (
    STAGE_CONTEXT_PRODUCTION,
    DEV_TYPE_NEW,
    LABEL_STATUS_NOT_UPLOADED,
    LABEL_STATUS_UPLOADED,
)


@pytest.fixture
def label_fixtures(session):
    customer = CustomerService(session).create_customer("Apex Auto")
    project = ProjectService(session).get_or_create_project(customer.id, "Apex-SUV")
    harness = HarnessService(session).create_harness(project.id, "HARN-APEX-01")
    rev = RevisionService(session).create_revision(
        harness_id=harness.id,
        revision_code="01",
        sop_number="SOP-APX-01",
        volume=10000,
        circuit_count=50,
    )
    eng = EngineerService(session).create_engineer("David Miller")
    ecn = ECNService(session).create_ecn(
        harness_id=harness.id,
        source_revision_id=rev.id,
        stage_context=STAGE_CONTEXT_PRODUCTION,
        development_type=DEV_TYPE_NEW,
        change_reason="Label upload workflow test",
        primary_engineer_id=eng.id,
        target_date=date(2026, 5, 1),
    )
    bom = BOMService(session).upload_bom(
        ecn_id=ecn.id,
        fg_code="FG9001",
        customer_part_number="CPN-9001",
        customer_revision="01",
        fg_revision="1A",
        uploaded_by_id=eng.id,
        upload_date=date(2026, 4, 1),
    )
    return {"bom": bom, "engineer": eng}


def test_label_upload_blocked_before_bom_release(session, label_fixtures):
    label_svc = LabelService(session)
    bom = label_fixtures["bom"]
    eng = label_fixtures["engineer"]

    assert bom.release_date is None
    assert bom.label_status == LABEL_STATUS_NOT_UPLOADED

    # Attempting to upload label before BOM release must be blocked
    with pytest.raises(PrematureLabelUploadError) as exc_info:
        label_svc.upload_label(
            bom_id=bom.id,
            uploaded_by_id=eng.id,
            reason="Initial release label",
            upload_date=date(2026, 4, 15),
        )
    assert "because the BOM has not been released yet" in str(exc_info.value)


def test_multiple_label_uploads_after_bom_release(session, label_fixtures):
    bom_svc = BOMService(session)
    label_svc = LabelService(session)
    bom = label_fixtures["bom"]
    eng = label_fixtures["engineer"]

    # First release BOM
    bom_svc.release_bom(bom.id, release_date=date(2026, 4, 10))
    session.refresh(bom)
    assert bom.release_date is not None

    # First label upload
    lbl1 = label_svc.upload_label(
        bom_id=bom.id,
        uploaded_by_id=eng.id,
        reason="Initial barcode layout uploaded.",
        upload_date=date(2026, 4, 12),
    )

    # Second label upload
    lbl2 = label_svc.upload_label(
        bom_id=bom.id,
        uploaded_by_id=eng.id,
        reason="Customer logo resolution corrected.",
        upload_date=date(2026, 4, 15),
    )

    session.refresh(bom)
    assert bom.label_status == LABEL_STATUS_UPLOADED
    assert len(bom.labels) == 2

    # Verify both history records preserved independently
    labels = label_svc.list_labels_for_bom(bom.id)
    assert len(labels) == 2
    assert labels[0].reason == "Customer logo resolution corrected."  # ordered desc by date
    assert labels[1].reason == "Initial barcode layout uploaded."
