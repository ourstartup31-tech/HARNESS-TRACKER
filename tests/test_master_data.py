"""Tests for Customer Master, Engineer Master, Project, and Harness hierarchy."""
import pytest
from app.engineering_tracker.services.customer_service import CustomerService
from app.engineering_tracker.services.engineer_service import EngineerService
from app.engineering_tracker.services.project_service import ProjectService
from app.engineering_tracker.services.harness_service import HarnessService
from app.engineering_tracker.services.exceptions import (
    DuplicateEntityError,
    BusinessValidationError,
    EntityNotFoundError,
)


def test_customer_creation_and_uniqueness(session):
    customer_svc = CustomerService(session)
    cust1 = customer_svc.create_customer("Tata Motors")
    assert cust1.id is not None
    assert cust1.name == "Tata Motors"
    assert cust1.is_active is True

    # Duplicate rejection
    with pytest.raises(DuplicateEntityError):
        customer_svc.create_customer("tata motors")

    # Empty name rejection
    with pytest.raises(BusinessValidationError):
        customer_svc.create_customer("   ")


def test_customer_can_have_multiple_projects(session):
    customer_svc = CustomerService(session)
    project_svc = ProjectService(session)

    cust = customer_svc.create_customer("Mahindra")
    proj1 = project_svc.get_or_create_project(cust.id, "Scorpio-N")
    proj2 = project_svc.get_or_create_project(cust.id, "XUV700")

    assert proj1.id != proj2.id
    assert proj1.customer_id == cust.id
    assert proj2.customer_id == cust.id
    assert len(cust.projects) == 2


def test_identical_model_names_under_different_customers_remain_separate(session):
    customer_svc = CustomerService(session)
    project_svc = ProjectService(session)

    cust_a = customer_svc.create_customer("Customer A")
    cust_b = customer_svc.create_customer("Customer B")

    proj_a = project_svc.get_or_create_project(cust_a.id, "Model X")
    proj_b = project_svc.get_or_create_project(cust_b.id, "Model X")

    assert proj_a.id != proj_b.id
    assert proj_a.customer_id == cust_a.id
    assert proj_b.customer_id == cust_b.id
    assert proj_a.model_name == proj_b.model_name


def test_project_can_contain_multiple_harnesses(session):
    customer_svc = CustomerService(session)
    project_svc = ProjectService(session)
    harness_svc = HarnessService(session)

    cust = customer_svc.create_customer("Maruti")
    proj = project_svc.get_or_create_project(cust.id, "Swift")

    h1 = harness_svc.create_harness(proj.id, "HARN-001")
    h2 = harness_svc.create_harness(proj.id, "HARN-002")

    assert h1.id != h2.id
    assert h1.project_id == proj.id
    assert h2.project_id == proj.id
    assert len(proj.harnesses) == 2


def test_duplicate_harness_numbers_globally_rejected(session):
    customer_svc = CustomerService(session)
    project_svc = ProjectService(session)
    harness_svc = HarnessService(session)

    cust_a = customer_svc.create_customer("Customer 1")
    cust_b = customer_svc.create_customer("Customer 2")
    proj_a = project_svc.get_or_create_project(cust_a.id, "Model 1")
    proj_b = project_svc.get_or_create_project(cust_b.id, "Model 2")

    harness_svc.create_harness(proj_a.id, "GLOBAL-HARNESS-99")

    # Attempting to reuse the same harness number under a different customer/model must fail
    with pytest.raises(DuplicateEntityError) as exc_info:
        harness_svc.create_harness(proj_b.id, "global-harness-99")
    assert "already exists in the company" in str(exc_info.value)


def test_historical_records_remain_when_customer_or_engineer_deactivated(session):
    customer_svc = CustomerService(session)
    engineer_svc = EngineerService(session)
    project_svc = ProjectService(session)
    harness_svc = HarnessService(session)

    cust = customer_svc.create_customer("Hyundai")
    proj = project_svc.get_or_create_project(cust.id, "Creta")
    harness = harness_svc.create_harness(proj.id, "HARN-CRETA-01")
    eng = engineer_svc.create_engineer("John Doe")

    # Deactivate Customer and Engineer
    customer_svc.set_active_status(cust.id, False)
    engineer_svc.set_active_status(eng.id, False)

    # Historical links remain intact
    session.refresh(cust)
    session.refresh(eng)
    assert cust.is_active is False
    assert eng.is_active is False

    refreshed_harness = harness_svc.get_harness_by_id(harness.id)
    assert refreshed_harness.project.customer.name == "Hyundai"
    assert refreshed_harness.project.customer.id == cust.id
