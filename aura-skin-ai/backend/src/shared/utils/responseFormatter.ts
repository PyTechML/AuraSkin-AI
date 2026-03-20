/**
 * Consistent API response format for frontend compatibility.
 */

export interface ApiSuccess<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
  code?: string;
}

export function formatSuccess<T>(data: T, message?: string): ApiSuccess<T> {
  return message ? { data, message } : { data };
}

export function formatError(
  statusCode: number,
  message: string,
  error?: string,
  code?: string
): ApiError {
  return { statusCode, message, ...(error && { error }), ...(code && { code }) };
}
