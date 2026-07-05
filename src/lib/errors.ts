/**
 * Domain errors. Server actions catch these and surface `message` to the
 * client; anything else becomes a generic "Something went wrong".
 */
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export class NotFoundError extends DomainError {
  constructor(message = "Not found") {
    super(message, "NOT_FOUND");
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = "You do not have access to this resource") {
    super(message, "FORBIDDEN");
  }
}

export class BudgetExhaustedError extends DomainError {
  constructor(
    message = "You have no applications left in your current window",
    public readonly nextSlotAt?: Date
  ) {
    super(message, "BUDGET_EXHAUSTED");
  }
}

export class JobPausedError extends DomainError {
  constructor(message = "This role has reached its applicant limit") {
    super(message, "JOB_PAUSED");
  }
}

export class DuplicateApplicationError extends DomainError {
  constructor(message = "You have already applied to this job") {
    super(message, "DUPLICATE_APPLICATION");
  }
}

export class RateLimitError extends DomainError {
  constructor(message = "Too many requests. Please slow down.") {
    super(message, "RATE_LIMITED");
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message, "VALIDATION");
  }
}

/** Convert any thrown value into a safe, user-facing message. */
export function toSafeMessage(err: unknown): string {
  if (err instanceof DomainError) return err.message;
  return "Something went wrong. Please try again.";
}
