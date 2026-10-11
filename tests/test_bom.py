"""Tests for SAP BOM upload/release, FG Code + Alternate uniqueness, and sequential alternates."""
import pytest
from datetime import date
from app.engineering_tracker.services.customer_service import CustomerService
from app.engineering_tracker.services.project_service import ProjectService
from app.engineering_tracker.services.harness_service import HarnessService
from app.engineering_tracker.services.revision_service import RevisionService
from app.engineering_tracker.services.engineer_service import EngineerService
from app.engineering_tracker.services.ecn_service import ECNService
from app.engineering_tracker.services.bom_service import BOMService
from app.engineering_tracker.services.exceptions import (
    DuplicateEntityError,
    InvalidAlternateSequenceError,
    BusinessValidationError,
)
from app.engineering_tracker.config import (
    STAGE_CONTEXT_SAMPLE,
    DEV_TYPE_NEW,
    BOM_STATUS_UPLOADED,
    BOM_STATUS_RELEASED,
)


@pytest.fixture
def bom_fixtures(session):
    customer = CustomerService(session).create_customer("Global Motors")
    project = ProjectService(session).get_or_create_project(customer.id, "EV-Platform")
    harness = HarnessService(session).create_harness(project.id, "HARN-EV-MAIN")
    rev = RevisionService(session).create_revision(
        harness_id=harness.id,
        revision_code="A",
        sop_number="SOP-EV-01",
        volume=5000,
        circuit_count=120,
    )
    eng = EngineerService(session).create_engineer("Sam Wilson")
    ecn = ECNService(session).create_ecn(
        harness_id=harness.id,
        source_revision_id=rev.id,
        stage_context=STAGE_CONTEXT_SAMPLE,
        development_type=DEV_TYPE_NEW,
        change_reason="Release initial BOM",
        primary_engineer_id=eng.id,
        target_date=date(2026, 4, 1),
    )
    return {"ecn": ecn, "engineer": eng}


def test_bom_upload_and_derived_status(session, bom_fixtures):
    bom_svc = BOMService(session)
    ecn = bom_fixtures["ecn"]
    eng = bom_fixtures["engineer"]

    bom = bom_svc.upload_bom(
        ecn_id=ecn.id,
        fg_code="FG10099",
        customer_part_number="CPN-7788",
        customer_revision="A",
        fg_revision="AA",
        uploaded_by_id=eng.id,
        upload_date=date(2026, 3, 20),
    )

    assert bom.id is not None
    assert bom.fg_code == "FG10099"
    assert bom.bom_alternate == "01"  # First alternate defaults to 01
    assert bom.bom_status == BOM_STATUS_UPLOADED
    assert bom.release_date is None

    # Release the BOM
    bom_svc.release_bom(bom.id, release_date=date(2026, 3, 22))
    session.refresh(bom)
    assert bom.bom_status == BOM_STATUS_RELEASED
    assert bom.release_date == date(2026, 3, 22)


def test_sequential_alternate_enforcement(session, bom_fixtures):
    bom_svc = BOMService(session)
    ecn = bom_fixtures["ecn"]
    eng = bom_fixtures["engineer"]

    # Upload Alternate 01
    bom1 = bom_svc.upload_bom(
        ecn_id=ecn.id,
        fg_code="FG20000",
        customer_part_number="CPN-101",
        customer_revision="A",
        fg_revision="AA",
        uploaded_by_id=eng.id,
    )
    assert bom1.bom_alternate == "01"

    # Attempting to jump to Alternate 03 must fail
    with pytest.raises(InvalidAlternateSequenceError) as exc_info:
        bom_svc.upload_bom(
            ecn_id=ecn.id,
            fg_code="FG20000",
            customer_part_number="CPN-101",
            customer_revision="B",
            fg_revision="BA",
            uploaded_by_id=eng.id,
            bom_alternate="03",
        )
    assert "The next expected sequential alternate is '02'" in str(exc_info.value)

    # Alternate 02 succeeds
    bom2 = bom_svc.upload_bom(
        ecn_id=ecn.id,
        fg_code="FG20000",
        customer_part_number="CPN-101",
        customer_revision="B",
        fg_revision="BA",
        uploaded_by_id=eng.id,
        bom_alternate="02",
    )
    assert bom2.bom_alternate == "02"


def test_duplicate_fg_and_alternate_rejected(session, bom_fixtures):
    bom_svc = BOMService(session)
    ecn = bom_fixtures["ecn"]
    eng = bom_fixtures["engineer"]

    bom_svc.upload_bom(
        ecn_id=ecn.id,
        fg_code="FG30000",
        customer_part_number="CPN-202",
        customer_revision="A",
        fg_revision="AA",
        uploaded_by_id=eng.id,
    )

    # Duplicate FG30000 + 01
    with pytest.raises(DuplicateEntityError):
        bom_svc.upload_bom(
            ecn_id=ecn.id,
            fg_code="fg30000",
            customer_part_number="CPN-202",
            customer_revision="A",
            fg_revision="AA",
            uploaded_by_id=eng.id,
            bom_alternate="01",
        )


def test_one_ecn_can_have_multiple_boms(session, bom_fixtures):
    bom_svc = BOMService(session)
    ecn = bom_fixtures["ecn"]
    eng = bom_fixtures["engineer"]

    b1 = bom_svc.upload_bom(
        ecn_id=ecn.id,
        fg_code="FG40001",
        customer_part_number="CPN-A",
        customer_revision="A",
        fg_revision="AA",
        uploaded_by_id=eng.id,
    )
    b2 = bom_svc.upload_bom(
        ecn_id=ecn.id,
        fg_code="FG40002",
        customer_part_number="CPN-B",
        customer_revision="A",
        fg_revision="AA",
        uploaded_by_id=eng.id,
    )

    boms = bom_svc.list_boms_for_ecn(ecn.id)
    assert len(boms) == 2
    assert b1 in boms
    assert b2 in boms
