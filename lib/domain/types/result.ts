/**
 * Generic Result type for error handling across the domain layer.
 * Enables functional error handling without try/catch in use cases.
 */

export interface Success<T> {
  ok: true
  data: T
}

export interface Failure {
  ok: false
  error: string
  code?: string
}

export type Result<T> = Success<T> | Failure

/**
 * Helper to create success results
 */
export function success<T>(data: T): Success<T> {
  return { ok: true, data }
}

/**
 * Helper to create failure results
 */
export function failure(message: string, code?: string): Failure {
  return { ok: false, error: message, code }
}

/**
 * Type guard for success
 */
export function isSuccess<T>(result: Result<T>): result is Success<T> {
  return result.ok
}

/**
 * Type guard for failure
 */
export function isFailure<T>(result: Result<T>): result is Failure {
  return !result.ok
}

/**
 * Unwrap a result, throwing if it's a failure.
 * Use sparingly - prefer pattern matching with isSuccess/isFailure.
 */
export function unwrap<T>(result: Result<T>): T {
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data
}
