/**
 * Safely extract an error message from an unknown caught value.
 *
 * @param error - The caught error value (unknown type from catch blocks)
 * @returns A human-readable error message string
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
