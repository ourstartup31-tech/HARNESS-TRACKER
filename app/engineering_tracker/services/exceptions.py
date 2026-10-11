"""Custom business exceptions with clear Poka-Yoke explanation messages."""


class BusinessValidationError(Exception):
    """Base class for all business rule and Poka-Yoke validation failures."""

    def __init__(self, message: str, field: str | None = None):
        super().__init__(message)
        self.message = message
        self.field = field


class DuplicateEntityError(BusinessValidationError):
    """Raised when an entity uniqueness constraint is violated."""

    pass


class ActiveRevisionConflictError(BusinessValidationError):
    """Raised when an attempt is made to activate a revision while another revision is active."""

    pass


class AssignmentLockedError(BusinessValidationError):
    """Raised when an attempt is made to reassign a primary engineer after work has started."""

    pass


class CostingRFQRequiredError(BusinessValidationError):
    """Raised when Costing Required = Yes on an ECN without a linked RFQ."""

    pass


class DelayReasonRequiredError(BusinessValidationError):
    """Raised when MIN Meeting Date > Target Date but no Delay Reason is supplied."""

    pass


class UnresolvedQueryBlockError(BusinessValidationError):
    """Raised when an unresolved query blocks Costing BOM submission."""

    pass


class PrematureLabelUploadError(BusinessValidationError):
    """Raised when a label upload is attempted on a BOM that has not been released."""

    pass


class InvalidAlternateSequenceError(BusinessValidationError):
    """Raised when BOM alternate sequence is non-sequential or duplicated."""

    pass


class MINPrerequisiteError(BusinessValidationError):
    """Raised when an operation requires a completed MIN meeting that is missing."""

    pass


class EntityNotFoundError(BusinessValidationError):
    """Raised when a requested entity cannot be found in the database."""

    pass
