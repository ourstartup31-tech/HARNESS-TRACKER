"""Tests for RFQ tracking, unique numbering, and query blocking validation."""
import pytest
from datetime import date
from app.engineering_tracker.services.customer_service import CustomerService
from app.engineering_tracker.services.project_service import ProjectService
from app.engineering_tracker.services.harness_service import HarnessService
from app.engineering_tracker.services.revision_service import RevisionService
from app.engineering_tracker.services.rfq_service import RFQService
from app.engineering_tracker.services.exceptions import (
    UnresolvedQueryBlockError,
    BusinessValidationError,
)
from app.engineering_tracker.config import (
    RFQ_STATUS_OPEN,
    RFQ_STATUS_COMPLETED,
    QUERY_STATUS_OPEN,
    QUERY_STATUS_RESOLVED,
)


@pytest.fixture
def rfq_setup(session):
    customer = CustomerService(session).create_customer("Maruti Suzuki")
    project = ProjectService(session).get_or_create_project(customer.id, "Brezza")
    harness = HarnessService(session).create_harness(project.id, "HARN-BREZZA-FLOOR")
    revision = RevisionService(session).create_revision(
        harness_id=harness.id,
        revision_code="01",
        sop_number="SOP-BRZ-01",
        volume=12000,
        circuit_count=45,
    )
    return {"harness": harness, "revision": revision}


def test_rfq_creation_and_numbering(session, rfq_setup):
    rfq_svc = RFQService(session)
    harness = rfq_setup["harness"]
    rev = rfq_setup["revision"]

    rfq1 = rfq_svc.create_rfq(
        harness_id=harness.id,
        revision_id=rev.id,
        marketing_input_date=date(2026, 1, 10),
        design_input_date=date(2026, 1, 12),
        target_date=date(2026, 1, 20),
    )

    assert rfq1.id is not None
    assert rfq1.rfq_number.startswith("RFQ-")
    assert rfq1.overall_rfq_status == RFQ_STATUS_OPEN
    assert rfq1.harness.harness_number == harness.harness_number
    assert rfq1.revision.revision_code == "01"


def test_multiple_rfqs_for_same_harness_and_revision(session, rfq_setup):
    rfq_svc = RFQService(session)
    harness = rfq_setup["harness"]
    rev = rfq_setup["revision"]

    rfq1 = rfq_svc.create_rfq(harness_id=harness.id, revision_id=rev.id)
    rfq2 = rfq_svc.create_rfq(harness_id=harness.id, revision_id=rev.id)

    assert rfq1.id != rfq2.id
    assert rfq1.rfq_number != rfq2.rfq_number
    assert len(rev.rfqs) == 2


def test_unresolved_query_blocks_costing_bom_submission(session, rfq_setup):
    rfq_svc = RFQService(session)
    harness = rfq_setup["harness"]
    rev = rfq_setup["revision"]

    # Attempting to submit costing BOM when query is Open should raise UnresolvedQueryBlockError
    with pytest.raises(UnresolvedQueryBlockError) as exc_info:
        rfq_svc.create_rfq(
            harness_id=harness.id,
            revision_id=rev.id,
            query_yes_no=True,
            query_submitted_date=date(2026, 2, 1),
            query_status=QUERY_STATUS_OPEN,
            costing_bom_submitted_date=date(2026, 2, 5),
        )
    assert "Cannot record Costing BOM Submitted Date while an unresolved query exists" in str(exc_info.value)


def test_resolved_query_allows_costing_bom_submission(session, rfq_setup):
    rfq_svc = RFQService(session)
    harness = rfq_setup["harness"]
    rev = rfq_setup["revision"]

    # When query is Resolved, Costing BOM submission succeeds
    rfq = rfq_svc.create_rfq(
        harness_id=harness.id,
        revision_id=rev.id,
        query_yes_no=True,
        query_submitted_date=date(2026, 2, 1),
        reply_received_date=date(2026, 2, 3),
        query_status=QUERY_STATUS_RESOLVED,
        costing_bom_submitted_date=date(2026, 2, 5),
    )
    assert rfq.costing_bom_submitted_date == date(2026, 2, 5)
    assert rfq.query_status == QUERY_STATUS_RESOLVED


def test_rfq_status_manual_and_independent(session, rfq_setup):
    rfq_svc = RFQService(session)
    harness = rfq_setup["harness"]
    rev = rfq_setup["revision"]

    rfq = rfq_svc.create_rfq(harness_id=harness.id, revision_id=rev.id)
    assert rfq.overall_rfq_status == RFQ_STATUS_OPEN

    # Manually transition status
    rfq_svc.update_rfq(rfq.id, overall_rfq_status=RFQ_STATUS_COMPLETED)
    session.refresh(rfq)
    assert rfq.overall_rfq_status == RFQ_STATUS_COMPLETED
