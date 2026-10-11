"""Tests for Harness Revisions, historical preservation, and the single-active constraint."""
import pytest
from app.engineering_tracker.services.customer_service import CustomerService
from app.engineering_tracker.services.project_service import ProjectService
from app.engineering_tracker.services.harness_service import HarnessService
from app.engineering_tracker.services.revision_service import RevisionService
from app.engineering_tracker.services.exceptions import (
    ActiveRevisionConflictError,
    DuplicateEntityError,
    BusinessValidationError,
)
from app.engineering_tracker.config import ACTIVE_STATUS, OBSOLETE_STATUS


@pytest.fixture
def sample_harness(session):
    customer = CustomerService(session).create_customer("OEM Client")
    project = ProjectService(session).get_or_create_project(customer.id, "Sedan-2026")
    return HarnessService(session).create_harness(project.id, "HARN-SEDAN-01")


def test_harness_can_have_multiple_revisions(session, sample_harness):
    rev_svc = RevisionService(session)

    rev_a = rev_svc.create_revision(
        harness_id=sample_harness.id,
        revision_code="A",
        sop_number="SOP-001",
        volume=5000,
        circuit_count=12,
        status=OBSOLETE_STATUS,
    )
    rev_b = rev_svc.create_revision(
        harness_id=sample_harness.id,
        revision_code="B",
        sop_number="SOP-002",
        volume=7500,
        circuit_count=14,
        status=ACTIVE_STATUS,
    )

    revisions = rev_svc.list_revisions_for_harness(sample_harness.id)
    assert len(revisions) == 2
    assert revisions[0].revision_code == "A"
    assert revisions[1].revision_code == "B"


def test_second_active_revision_is_blocked(session, sample_harness):
    rev_svc = RevisionService(session)

    rev_svc.create_revision(
        harness_id=sample_harness.id,
        revision_code="A",
        sop_number="SOP-001",
        volume=5000,
        circuit_count=12,
        status=ACTIVE_STATUS,
    )

    # Attempting to create a second Active revision must be blocked with an explanatory message
    with pytest.raises(ActiveRevisionConflictError) as exc_info:
        rev_svc.create_revision(
            harness_id=sample_harness.id,
            revision_code="B",
            sop_number="SOP-002",
            volume=7500,
            circuit_count=14,
            status=ACTIVE_STATUS,
        )
    assert "Cannot activate Revision 'B' because Revision 'A' is still Active" in str(exc_info.value)
    assert "Manually mark Revision 'A' as Obsolete before activating" in str(exc_info.value)


def test_new_revision_activated_after_manual_obsolescence(session, sample_harness):
    rev_svc = RevisionService(session)

    rev_a = rev_svc.create_revision(
        harness_id=sample_harness.id,
        revision_code="A",
        sop_number="SOP-001",
        volume=5000,
        circuit_count=12,
        status=ACTIVE_STATUS,
    )

    # First, user manually marks Rev A as Obsolete
    rev_svc.set_revision_status(rev_a.id, OBSOLETE_STATUS)
    session.refresh(rev_a)
    assert rev_a.status == OBSOLETE_STATUS

    # Now activating Rev B succeeds
    rev_b = rev_svc.create_revision(
        harness_id=sample_harness.id,
        revision_code="B",
        sop_number="SOP-002",
        volume=7500,
        circuit_count=14,
        status=ACTIVE_STATUS,
    )
    assert rev_b.status == ACTIVE_STATUS


def test_multiple_obsolete_revisions_are_allowed(session, sample_harness):
    rev_svc = RevisionService(session)

    rev_a = rev_svc.create_revision(
        harness_id=sample_harness.id,
        revision_code="A",
        sop_number="SOP-001",
        volume=5000,
        circuit_count=12,
        status=OBSOLETE_STATUS,
    )
    rev_b = rev_svc.create_revision(
        harness_id=sample_harness.id,
        revision_code="B",
        sop_number="SOP-002",
        volume=7500,
        circuit_count=14,
        status=OBSOLETE_STATUS,
    )
    rev_c = rev_svc.create_revision(
        harness_id=sample_harness.id,
        revision_code="C",
        sop_number="SOP-003",
        volume=10000,
        circuit_count=16,
        status=OBSOLETE_STATUS,
    )

    revisions = rev_svc.list_revisions_for_harness(sample_harness.id)
    assert len(revisions) == 3
    assert all(r.status == OBSOLETE_STATUS for r in revisions)


def test_revision_specific_fields_remain_historically_correct(session, sample_harness):
    rev_svc = RevisionService(session)

    rev_a = rev_svc.create_revision(
        harness_id=sample_harness.id,
        revision_code="A",
        sop_number="SOP-001",
        volume=5000,
        circuit_count=12,
        status=OBSOLETE_STATUS,
    )
    rev_b = rev_svc.create_revision(
        harness_id=sample_harness.id,
        revision_code="B",
        sop_number="SOP-002",
        volume=8000,
        circuit_count=18,
        status=ACTIVE_STATUS,
    )

    # Verify that creating Rev B did not mutate Rev A's data
    session.refresh(rev_a)
    session.refresh(rev_b)

    assert rev_a.sop_number == "SOP-001"
    assert rev_a.volume == 5000
    assert rev_a.circuit_count == 12

    assert rev_b.sop_number == "SOP-002"
    assert rev_b.volume == 8000
    assert rev_b.circuit_count == 18


def test_duplicate_revision_for_same_harness_rejected(session, sample_harness):
    rev_svc = RevisionService(session)

    rev_svc.create_revision(
        harness_id=sample_harness.id,
        revision_code="A",
        sop_number="SOP-001",
        volume=5000,
        circuit_count=12,
        status=ACTIVE_STATUS,
    )

    with pytest.raises(DuplicateEntityError):
        rev_svc.create_revision(
            harness_id=sample_harness.id,
            revision_code="a",
            sop_number="SOP-DIFF",
            volume=6000,
            circuit_count=14,
            status=OBSOLETE_STATUS,
        )
