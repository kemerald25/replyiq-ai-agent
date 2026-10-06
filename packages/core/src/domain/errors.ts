export class NotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = "Unauthorized access to resource") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class VersionConflictError extends Error {
  constructor(
    public readonly expectedVersion: number,
    public readonly actualVersion: number,
    message: string = `Version conflict: expected version ${expectedVersion}, but actual version is ${actualVersion}`
  ) {
    super(message);
    this.name = "VersionConflictError";
  }
}

export class SlugUnavailableError extends Error {
  constructor(
    public readonly slug: string,
    message: string = `Slug "${slug}" is reserved, already taken, or in a 30-day deletion cooldown.`
  ) {
    super(message);
    this.name = "SlugUnavailableError";
  }
}

export class AssetValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssetValidationError";
  }
}

export class RollbackNotAvailableError extends Error {
  constructor(projectId: string) {
    super(`No previous published version found to roll back project: ${projectId}`);
    this.name = "RollbackNotAvailableError";
  }
}

export class PublishValidationError extends Error {
  constructor(
    public readonly errors: string[] = [],
    message: string = `Site document failed validation for publish: ${(errors || []).join(", ")}`
  ) {
    super(message);
    this.name = "PublishValidationError";
  }
}
