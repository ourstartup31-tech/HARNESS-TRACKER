"""Initial database seed script with realistic automotive wiring-harness data."""
from datetime import date, timedelta
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.engineering_tracker.models.customer import Customer
from app.engineering_tracker.services.customer_service import CustomerService
from app.engineering_tracker.services.engineer_service import EngineerService
from app.engineering_tracker.services.project_service import ProjectService
from app.engineering_tracker.services.harness_service import HarnessService
from app.engineering_tracker.services.revision_service import RevisionService
from app.engineering_tracker.services.rfq_service import RFQService
from app.engineering_tracker.services.ecn_service import ECNService
from app.engineering_tracker.services.bom_service import BOMService
from app.engineering_tracker.services.min_service import MINService
from app.engineering_tracker.services.kit_service import KitService
from app.engineering_tracker.config import (
    STAGE_CONTEXT_SAMPLE,
    STAGE_CONTEXT_PRODUCTION,
    DEV_TYPE_NEW,
    DEV_TYPE_PRODUCTIZED,
    ACTIVE_STATUS,
    OBSOLETE_STATUS,
    REVISION_IMPACT_NEW,
    REVISION_IMPACT_SAME,
    QUERY_STATUS_RESOLVED,
)


def seed_database_if_empty(session: Session) -> None:
    """Populate database with initial realistic master and sample data if no customers exist."""
    existing_cust = session.execute(select(Customer)).first()
    if existing_cust:
        return  # Already seeded or contains data

    # 1. Customers
    cust_svc = CustomerService(session)
    tata = cust_svc.create_customer("Tata Motors")
    mahindra = cust_svc.create_customer("Mahindra & Mahindra")
    maruti = cust_svc.create_customer("Maruti Suzuki")

    # 2. Engineers
    eng_svc = EngineerService(session)
    eng1 = eng_svc.create_engineer("Rajesh Sharma")
    eng2 = eng_svc.create_engineer("Priya Nair")
    eng3 = eng_svc.create_engineer("Amit Verma")
    eng4 = eng_svc.create_engineer("Kavita Iyer")

    # 3. Projects & Harnesses
    proj_svc = ProjectService(session)
    harn_svc = HarnessService(session)
    rev_svc = RevisionService(session)

    # Tata Nexon Project
    nexon = proj_svc.get_or_create_project(tata.id, "Nexon-EV")
    harn_nexon_main = harn_svc.create_harness(nexon.id, "HARN-NXN-MAIN-01")
    rev_nexon_a = rev_svc.create_revision(
        harness_id=harn_nexon_main.id,
        revision_code="A",
        sop_number="SOP-NXN-001",
        volume=12000,
        circuit_count=84,
        status=OBSOLETE_STATUS,
    )
    rev_nexon_b = rev_svc.create_revision(
        harness_id=harn_nexon_main.id,
        revision_code="B",
        sop_number="SOP-NXN-002",
        volume=14500,
        circuit_count=88,
        status=ACTIVE_STATUS,
    )

    harn_nexon_door = harn_svc.create_harness(nexon.id, "HARN-NXN-DOOR-01")
    rev_nexon_door_a = rev_svc.create_revision(
        harness_id=harn_nexon_door.id,
        revision_code="A",
        sop_number="SOP-NXN-003",
        volume=12000,
        circuit_count=18,
        status=ACTIVE_STATUS,
    )

    # Mahindra Scorpio-N Project
    scorpio = proj_svc.get_or_create_project(mahindra.id, "Scorpio-N")
    harn_scorpio_eng = harn_svc.create_harness(scorpio.id, "HARN-SCP-ENG-01")
    rev_scorpio_01 = rev_svc.create_revision(
        harness_id=harn_scorpio_eng.id,
        revision_code="01",
        sop_number="SOP-SCP-101",
        volume=8000,
        circuit_count=110,
        status=ACTIVE_STATUS,
    )

    # 4. RFQ Tracking
    rfq_svc = RFQService(session)
    rfq1 = rfq_svc.create_rfq(
        harness_id=harn_nexon_main.id,
        revision_id=rev_nexon_b.id,
        marketing_input_date=date.today() - timedelta(days=30),
        design_input_date=date.today() - timedelta(days=28),
        work_start_date=date.today() - timedelta(days=25),
        target_date=date.today() - timedelta(days=15),
        costing_bom_submitted_date=date.today() - timedelta(days=14),
        query_yes_no=True,
        query_submitted_date=date.today() - timedelta(days=22),
        reply_received_date=date.today() - timedelta(days=20),
        query_status=QUERY_STATUS_RESOLVED,
        query_remark="Terminal plating confirmed with marketing.",
        proposal_yes_no=True,
        proposal_submitted_date=date.today() - timedelta(days=12),
        proposal_status="Submitted",
        overall_rfq_status="Submitted",
    )

    rfq2 = rfq_svc.create_rfq(
        harness_id=harn_scorpio_eng.id,
        revision_id=rev_scorpio_01.id,
        marketing_input_date=date.today() - timedelta(days=5),
        design_input_date=date.today() - timedelta(days=3),
        target_date=date.today() + timedelta(days=7),
    )

    # 5. ECN Tracking
    ecn_svc = ECNService(session)
    ecn1 = ecn_svc.create_ecn(
        harness_id=harn_nexon_main.id,
        source_revision_id=rev_nexon_a.id,
        stage_context=STAGE_CONTEXT_PRODUCTION,
        development_type=DEV_TYPE_NEW,
        change_reason="Add DC fast-charging sensor junction and increase high-voltage grounding gauge.",
        revision_impact=REVISION_IMPACT_NEW,
        new_revision_id=rev_nexon_b.id,
        costing_required=True,
        rfq_id=rfq1.id,
        primary_engineer_id=eng1.id,
        support_engineer_id=eng2.id,
        design_input_date=date.today() - timedelta(days=28),
        work_start_date=date.today() - timedelta(days=24),
        target_date=date.today() - timedelta(days=8),
        min_meeting_date=date.today() - timedelta(days=6),
        delay_reason="Awaiting customer fast-charger mating connector sample.",
    )

    # 6. BOM Upload & Release
    bom_svc = BOMService(session)
    bom1 = bom_svc.upload_bom(
        ecn_id=ecn1.id,
        fg_code="FG-NXN-MAIN-901",
        customer_part_number="28400-NXN-0100",
        customer_revision="B",
        fg_revision="BA",
        uploaded_by_id=eng1.id,
        upload_date=date.today() - timedelta(days=10),
    )
    bom_svc.release_bom(bom1.id, release_date=date.today() - timedelta(days=8))

    # 7. MIN Meeting
    min_svc = MINService(session)
    min_svc.record_min_meeting(
        ecn_id=ecn1.id,
        meeting_date=date.today() - timedelta(days=6),
        remarks="All harness circuits tested and approved for sample build.",
    )

    # 8. Consolidated Active Kit Entry
    kit_svc = KitService(session)
    kit_svc.create_or_update_kit_entry(
        ecn_id=ecn1.id,
        rack_number="RACK-EV-02",
        file_number="FILE-NXN-88",
        hard_copy_location="Master Archive Cabinets, Tier 3",
        status=ACTIVE_STATUS,
    )

    session.commit()
