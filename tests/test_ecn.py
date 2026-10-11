"""Tests for ECN change management, Poka-Yoke validations, engineer locking, and delay rules."""
import pytest
from datetime import date
from app.engineering_tracker.services.customer_service import CustomerService
from app.engineering_tracker.services.project_service import ProjectService
from app.engineering_tracker.services.harness_service import HarnessService
from app.engineering_tracker.services.revision_service import RevisionService
from app.engineering_tracker.services.engineer_service import EngineerService
from app.engineering_tracker.services.rfq_service import RFQService
from app.engineering_tracker.services.ecn_service import ECNService
from app.engineering_tracker.services.exceptions import (
    BusinessValidationError,
    AssignmentLockedError,
    CostingRFQRequiredError,
    DelayReasonRequiredError,
)
from app.engineering_tracker.config import (
    STAGE_CONTEXT_SAMPLE,
    DEV_TYPE_NEW,
    REVISION_IMPACT_NEW,
    REVISION_IMPACT_SAME,
    OBSOLETE_STATUS,
    ACTIVE_STATUS,
)


@pytest.fixture
def ecn_fixtures(session):
    customer = CustomerService(session).create_customer("Commercial Motors")
    project = ProjectService(session).get_or_create_project(customer.id, "Truck-H")
    harness = HarnessService(session).create_harness(project.id, "HARN-TRUCK-CABIN")
    rev1 = RevisionService(session).create_revision(
        harness_id=harness.id,
        revision_code="A",
        sop_number="SOP-TRK-01",
        volume=2000,
        circuit_count=80,
        status=ACTIVE_STATUS,
    )
    eng1 = EngineerService(session).create_engineer("Alice Smith")
    eng2 = EngineerService(session).create_engineer("Bob Jones")
    return {
        "harness": harness,
        "source_rev": rev1,
        "eng1": eng1,
        "eng2": eng2,
    }


def test_ecn_creation_and_numbering(session, ecn_fixtures):
    ecn_svc = ECNService(session)
    harness = ecn_fixtures["harness"]
    rev = ecn_fixtures["source_rev"]
    eng = ecn_fixtures["eng1"]

    ecn = ecn_svc.create_ecn(
        harness_id=harness.id,
        source_revision_id=rev.id,
        stage_context=STAGE_CONTEXT_SAMPLE,
        development_type=DEV_TYPE_NEW,
        change_reason="Wire gauge upgrade for alternator circuit.",
        primary_engineer_id=eng.id,
        target_date=date(2026, 3, 15),
    )

    assert ecn.id is not None
    assert ecn.ecn_number.startswith("ECN-")
    assert ecn.primary_engineer.name == "Alice Smith"
    assert ecn.support_engineer is None


def test_mandatory_change_reason(session, ecn_fixtures):
    ecn_svc = ECNService(session)
    harness = ecn_fixtures["harness"]
    rev = ecn_fixtures["source_rev"]
    eng = ecn_fixtures["eng1"]

    with pytest.raises(BusinessValidationError) as exc_info:
        ecn_svc.create_ecn(
            harness_id=harness.id,
            source_revision_id=rev.id,
            stage_context=STAGE_CONTEXT_SAMPLE,
            development_type=DEV_TYPE_NEW,
            change_reason="   ",
            primary_engineer_id=eng.id,
            target_date=date(2026, 3, 15),
        )
    assert "Change/Reason is mandatory" in str(exc_info.value)


def test_new_revision_required_for_new_revision_impact(session, ecn_fixtures):
    ecn_svc = ECNService(session)
    harness = ecn_fixtures["harness"]
    rev = ecn_fixtures["source_rev"]
    eng = ecn_fixtures["eng1"]

    # Fails if new_revision_id is None
    with pytest.raises(BusinessValidationError) as exc_info:
        ecn_svc.create_ecn(
            harness_id=harness.id,
            source_revision_id=rev.id,
            stage_context=STAGE_CONTEXT_SAMPLE,
            development_type=DEV_TYPE_NEW,
            change_reason="Connector change",
            primary_engineer_id=eng.id,
            target_date=date(2026, 3, 15),
            revision_impact=REVISION_IMPACT_NEW,
            new_revision_id=None,
        )
    assert "New Revision must be provided" in str(exc_info.value)


def test_costing_required_demands_rfq(session, ecn_fixtures):
    ecn_svc = ECNService(session)
    harness = ecn_fixtures["harness"]
    rev = ecn_fixtures["source_rev"]
    eng = ecn_fixtures["eng1"]

    with pytest.raises(CostingRFQRequiredError):
        ecn_svc.create_ecn(
            harness_id=harness.id,
            source_revision_id=rev.id,
            stage_context=STAGE_CONTEXT_SAMPLE,
            development_type=DEV_TYPE_NEW,
            change_reason="Material change requiring cost quotation",
            primary_engineer_id=eng.id,
            target_date=date(2026, 3, 15),
            costing_required=True,
            rfq_id=None,
        )

    # When RFQ is created and linked, it succeeds even if Same Revision
    rfq = RFQService(session).create_rfq(harness_id=harness.id, revision_id=rev.id)
    ecn = ecn_svc.create_ecn(
        harness_id=harness.id,
        source_revision_id=rev.id,
        stage_context=STAGE_CONTEXT_SAMPLE,
        development_type=DEV_TYPE_NEW,
        change_reason="Material change requiring cost quotation",
        primary_engineer_id=eng.id,
        target_date=date(2026, 3, 15),
        revision_impact=REVISION_IMPACT_SAME,
        costing_required=True,
        rfq_id=rfq.id,
    )
    assert ecn.costing_required is True
    assert ecn.related_rfq.id == rfq.id


def test_primary_engineer_reassignment_locked_after_work_starts(session, ecn_fixtures):
    ecn_svc = ECNService(session)
    harness = ecn_fixtures["harness"]
    rev = ecn_fixtures["source_rev"]
    eng1 = ecn_fixtures["eng1"]
    eng2 = ecn_fixtures["eng2"]

    ecn = ecn_svc.create_ecn(
        harness_id=harness.id,
        source_revision_id=rev.id,
        stage_context=STAGE_CONTEXT_SAMPLE,
        development_type=DEV_TYPE_NEW,
        change_reason="Initial design",
        primary_engineer_id=eng1.id,
        target_date=date(2026, 3, 15),
    )

    # Before work starts: assignment correction is allowed
    ecn_svc.update_ecn(ecn.id, primary_engineer_id=eng2.id)
    session.refresh(ecn)
    assert ecn.primary_engineer_id == eng2.id

    # Record work start date
    ecn_svc.update_ecn(ecn.id, work_start_date=date(2026, 3, 1))

    # After work starts: primary engineer reassignment must be blocked
    with pytest.raises(AssignmentLockedError) as exc_info:
        ecn_svc.update_ecn(ecn.id, primary_engineer_id=eng1.id)
    assert "cannot be reassigned after Work Start Date" in str(exc_info.value)


def test_duration_calculations_and_delay_reason_enforcement(session, ecn_fixtures):
    ecn_svc = ECNService(session)
    harness = ecn_fixtures["harness"]
    rev = ecn_fixtures["source_rev"]
    eng = ecn_fixtures["eng1"]

    # Target: March 10, Work Start: March 1
    # Planned duration: 9 days
    ecn = ecn_svc.create_ecn(
        harness_id=harness.id,
        source_revision_id=rev.id,
        stage_context=STAGE_CONTEXT_SAMPLE,
        development_type=DEV_TYPE_NEW,
        change_reason="Terminal tooling modification",
        primary_engineer_id=eng.id,
        work_start_date=date(2026, 3, 1),
        target_date=date(2026, 3, 10),
    )
    assert ecn.planned_duration == 9

    # MIN Date: March 15 (> Target March 10, 5 days delay)
    # Attempting to record delayed MIN date without delay reason must raise DelayReasonRequiredError
    with pytest.raises(DelayReasonRequiredError) as exc_info:
        ecn_svc.update_ecn(ecn.id, min_meeting_date=date(2026, 3, 15), delay_reason="  ")
    assert "A Delay Reason is mandatory" in str(exc_info.value)

    # Providing delay reason succeeds
    ecn_svc.update_ecn(
        ecn.id,
        min_meeting_date=date(2026, 3, 15),
        delay_reason="Awaiting customer connector drawing sign-off.",
    )
    session.refresh(ecn)
    assert ecn.actual_duration == 14
    assert ecn.delay_days == 5
    assert ecn.completion_date == date(2026, 3, 15)
    assert ecn.delay_reason == "Awaiting customer connector drawing sign-off."
