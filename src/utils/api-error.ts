interface ApiErrorResponse {
  response?: {
    status?: number;
    data?: {
      message?: string;
      error?: string;
      errors?: Record<string, string[]>;
    };
  };
  message?: string;
}

export function getSafeApiErrorMessage(error: unknown): string {
  if (!error) return 'Something went wrong. Please try again.';

  const err = error as ApiErrorResponse;

  // Check if it's an Axios-style or fetch error with a response
  if (err.response) {
    const status = err.response.status;
    const data = err.response.data;

    // Handle specific status codes
    if (status === 401) return 'Your session has expired. Please sign in again.';
    if (status === 403) return 'You do not have permission to perform this action.';
    if (status === 404) return 'The requested resource was not found.';
    if (status === 409) return 'This action cannot be completed in the current status.';
    if (status === 422) return 'Please correct the highlighted information.';
    if (status === 429) return 'Too many requests. Please try again later.';
    if (status === 500) return 'An internal server error occurred. Please try again.';
    if (status === 503) return 'The service is temporarily unavailable. Please try again shortly.';

    // Try to extract a safe backend message if available
    if (data) {
      if (typeof data.message === 'string' && !isUnsafeMessage(data.message)) {
        return data.message;
      }
      if (typeof data.error === 'string' && !isUnsafeMessage(data.error)) {
        return data.error;
      }
    }
  }

  // Handle network/fetch errors without a response object
  if (err.message) {
    if (err.message.toLowerCase().includes('network error') || err.message.toLowerCase().includes('failed to fetch')) {
      return 'Network error. Please check your connection and try again.';
    }
    if (err.message.toLowerCase().includes('timeout')) {
      return 'The request timed out. Please try again.';
    }
    // If it's a generic Error object without unsafe details, we could return it,
    // but the requirements say fallback to generic message. Let's return the fallback unless it's explicitly safe.
  }

  return 'Something went wrong. Please try again.';
}

function isUnsafeMessage(msg: string): boolean {
  const lowerMsg = msg.toLowerCase();
  return (
    lowerMsg.includes('select ') || 
    lowerMsg.includes('insert into') ||
    lowerMsg.includes('update ') ||
    lowerMsg.includes('delete from') ||
    lowerMsg.includes('sql') ||
    lowerMsg.includes('trace') ||
    lowerMsg.includes('smtp') ||
    lowerMsg.includes('token') ||
    msg.includes('/') ||
    msg.includes('\\') ||
    lowerMsg.includes('password')
  );
}
