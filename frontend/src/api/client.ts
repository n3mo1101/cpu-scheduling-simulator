/** Fetch wrapper for the simulation endpoint with typed failures. */

import type { ApiErrorItem, SimulateRequest, SimulateResponse } from "../types";

/** Message shown whenever the backend cannot be reached. */
export const NETWORK_ERROR_MESSAGE =
  "Could not reach the server. Is the backend running on port 8000?";

/** The backend rejected the request with a list of validation problems. */
export class ApiValidationError extends Error {
  readonly errors: ApiErrorItem[];

  constructor(errors: ApiErrorItem[]) {
    super("The request could not be validated.");
    this.name = "ApiValidationError";
    this.errors = errors;
  }
}

/** The backend could not be reached at all. */
export class ApiNetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiNetworkError";
  }
}

/** The backend returned an unexpected HTTP error. */
export class ApiServerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiServerError";
  }
}

function isApiErrorItem(value: unknown): value is ApiErrorItem {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const item = value as Record<string, unknown>;
  return (
    (item.row === null || typeof item.row === "number") &&
    (item.field === null || typeof item.field === "string") &&
    typeof item.message === "string"
  );
}

function isApiErrorResponse(value: unknown): value is { errors: ApiErrorItem[] } {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as { errors?: unknown };
  return (
    Array.isArray(candidate.errors) &&
    candidate.errors.length > 0 &&
    candidate.errors.every(isApiErrorItem)
  );
}

/** Run a simulation, converting failures into typed, user-friendly errors. */
export async function simulate(request: SimulateRequest): Promise<SimulateResponse> {
  let response: Response;

  try {
    response = await fetch("/api/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch {
    throw new ApiNetworkError(NETWORK_ERROR_MESSAGE);
  }

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    if (response.status === 422 && isApiErrorResponse(body)) {
      throw new ApiValidationError(body.errors);
    }

    if (response.status >= 500 && body === null) {
      throw new ApiNetworkError(NETWORK_ERROR_MESSAGE);
    }

    throw new ApiServerError(
      `The server returned an unexpected error (HTTP ${response.status}).`,
    );
  }

  const body: unknown = await response.json();
  return body as SimulateResponse;
}

/** Check whether the backend is reachable. Never throws. */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch("/api/health", { cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  }
}
