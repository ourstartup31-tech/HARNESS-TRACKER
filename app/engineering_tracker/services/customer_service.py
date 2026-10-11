"""Customer service for managing customer master records."""
from typing import List, Optional
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.engineering_tracker.models.customer import Customer
from app.engineering_tracker.services.exceptions import (
    BusinessValidationError,
    DuplicateEntityError,
    EntityNotFoundError,
)
from app.engineering_tracker.config import DEFAULT_USER


class CustomerService:
    """Service handling Customer Master operations and validations."""

    def __init__(self, session: Session):
        self.session = session

    def create_customer(
        self, name: str, created_by: Optional[str] = None
    ) -> Customer:
        """Create a new customer. Prevent duplicate names."""
        clean_name = (name or "").strip()
        if not clean_name:
            raise BusinessValidationError("Customer name must be provided.", field="name")

        # Check existing customer name (case-insensitive)
        stmt = select(Customer).where(func.lower(Customer.name) == clean_name.lower())
        existing = self.session.execute(stmt).scalar_one_or_none()
        if existing:
            raise DuplicateEntityError(
                f"A customer with name '{clean_name}' already exists.", field="name"
            )

        user = created_by or DEFAULT_USER
        customer = Customer(name=clean_name, is_active=True, created_by=user, modified_by=user)
        self.session.add(customer)
        self.session.flush()
        return customer

    def update_customer(
        self, customer_id: int, name: str, modified_by: Optional[str] = None
    ) -> Customer:
        """Update customer name while ensuring uniqueness."""
        customer = self.get_customer_by_id(customer_id)
        clean_name = (name or "").strip()
        if not clean_name:
            raise BusinessValidationError("Customer name cannot be empty.", field="name")

        # Check duplicate
        stmt = (
            select(Customer)
            .where(func.lower(Customer.name) == clean_name.lower())
            .where(Customer.id != customer_id)
        )
        duplicate = self.session.execute(stmt).scalar_one_or_none()
        if duplicate:
            raise DuplicateEntityError(
                f"Another customer with name '{clean_name}' already exists.", field="name"
            )

        customer.name = clean_name
        customer.modified_by = modified_by or DEFAULT_USER
        self.session.flush()
        return customer

    def set_active_status(
        self, customer_id: int, is_active: bool, modified_by: Optional[str] = None
    ) -> Customer:
        """Activate or deactivate a customer without deleting historical associations."""
        customer = self.get_customer_by_id(customer_id)
        customer.is_active = is_active
        customer.modified_by = modified_by or DEFAULT_USER
        self.session.flush()
        return customer

    def get_customer_by_id(self, customer_id: int) -> Customer:
        """Retrieve customer by ID or raise EntityNotFoundError."""
        customer = self.session.get(Customer, customer_id)
        if not customer:
            raise EntityNotFoundError(f"Customer with ID {customer_id} does not exist.")
        return customer

    def list_customers(self, active_only: bool = False) -> List[Customer]:
        """List customers, optionally filtering to active only."""
        stmt = select(Customer).order_by(Customer.name.asc())
        if active_only:
            stmt = stmt.where(Customer.is_active.is_(True))
        return list(self.session.execute(stmt).scalars().all())
