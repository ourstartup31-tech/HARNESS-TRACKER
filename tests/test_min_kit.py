"""Tests for MIN Meeting completion, Kit generation prerequisite, and source field derivation."""
import pytest
from datetime import date
from app.engineering_tracker.services.customer_service import CustomerService
from app.engineering_tracker.services.project_service import ProjectService
from app.engineering_tracker.services.harness_service import HarnessService
from app.engineering_tracker.services.revision_service import RevisionService
from app.engineering_tracker.services.engineer_service import EngineerService
from app.engineering_tracker.services.ecn_service import ECNService
from app.engineering_tracker.services.min_service import MINService
from app.engineering_tracker.services.kit_service import KitService
from app.engineering_tracker.services.exceptions import (
    DuplicateEntityError,
    MINPrerequisiteError,
    DelayReasonRequiredError,
)
from app.engineering_tracker.config import (
    STAGE_CONTEXT_PRODUCTION,
    DEV_TYPE_PRODUCTIZED,
    ACTIVE_STATUS,
    ECN_STATUS_COMPLETED,
)


@pytest.fixture
def min_kit_fixtures(session):
    customer = CustomerService(session).create_customer("Precision OEM")
    project = ProjectService(session).get_or_create_project(customer.id, "Platform-Z")
    harness = HarnessService(session).create_harness(project.id, "HARN-PZ-ENGINE")
    rev = RevisionService(session).create_revision(
        harness_id=harness.id,
        revision_code="B",
        sop_number="SOP-PZ-2026",
        volume=15000,
        circuit_count=64,
        status=ACTIVE_STATUS,
    )
    eng = EngineerService(session).create_engineer("Elena Rostova")
    ecn = ECNService(session).create_ecn(
        harness_id=harness.id,
        source_revision_id=rev.id,
        stage_context=STAGE_CONTEXT_PRODUCTION,
        development_type=DEV_TYPE_PRODUCTIZED,
        change_reason="Final production handoff",
        primary_engineer_id=eng.id,
        target_date=date(2026, 6, 1),
    )
    return {"ecn": ecn, "harness": harness, "revision": rev}


def test_kit_entry_blocked_before_min_completion(session, min_kit_fixtures):
    kit_svc = KitService(session)
    ecn = min_kit_fixtures["ecn"]

    # No MIN has been conducted yet: kit entry creation must be blocked
    with pytest.raises(MINPrerequisiteError) as exc_info:
        kit_svc.create_or_update_kit_entry(
            ecn_id=ecn.id,
            rack_number="R-04",
            file_number="F-12",
        )
    assert "No MIN, no Kit List entry" in str(exc_info.value)


def test_min_meeting_records_completion_and_allows_kit_generation(session, min_kit_fixtures):
    min_svc = MINService(session)
    kit_svc = KitService(session)
    ecn = min_kit_fixtures["ecn"]

    min_rec = min_svc.record_min_meeting(
        ecn_id=ecn.id,
        meeting_date=date(2026, 5, 28),
        remarks="All checks passed.",
    )

    session.refresh(ecn)
    assert ecn.min_meeting_date == date(2026, 5, 28)
    assert ecn.completion_date == date(2026, 5, 28)
    assert ecn.ecn_status == ECN_STATUS_COMPLETED

    # Now Kit entry creation succeeds
    kit_entry = kit_svc.create_or_update_kit_entry(
        ecn_id=ecn.id,
        rack_number="R-04",
        file_number="F-12",
        hard_copy_location="Cabinet 2, Shelf 3",
    )

    assert kit_entry.id is not None
    assert kit_entry.rack_number == "R-04"
    assert kit_entry.file_number == "F-12"

    # Verify generated view pulls source information automatically without duplication
    rows = kit_svc.get_consolidated_active_kit_list()
    assert len(rows) == 1
    row = rows[0]
    assert row["ecn_number"] == ecn.ecn_number
    assert row["min_meeting_date"] == date(2026, 5, 28)
    assert row["harness_number"] == "HARN-PZ-ENGINE"
    assert row["revision_code"] == "B"
    assert row["sop_number"] == "SOP-PZ-2026"
    assert row["volume"] == 15000
    assert row["circuit_count"] == 64
    assert row["stage_context"] == STAGE_CONTEXT_PRODUCTION
    assert row["development_type"] == DEV_TYPE_PRODUCTIZED
    assert row["rack_number"] == "R-04"
    assert row["file_number"] == "F-12"


def test_one_ecn_cannot_have_multiple_mins(session, min_kit_fixtures):
    min_svc = MINService(session)
    ecn = min_kit_fixtures["ecn"]

    min_svc.record_min_meeting(ecn_id=ecn.id, meeting_date=date(2026, 5, 28))

    with pytest.raises(DuplicateEntityError) as exc_info:
        min_svc.record_min_meeting(ecn_id=ecn.id, meeting_date=date(2026, 5, 30))
    assert "Only one MIN meeting is permitted per ECN" in str(exc_info.value)
