interface ApiErrorData {
  message?: string;
  error?: string;
  code?: string;
  errors?: Record<string, string[]>;
}

interface ApiErrorResponse {
  name?: string;
  status?: number;
  data?: ApiErrorData;
  response?: {
    status?: number;
    data?: ApiErrorData;
  };
  message?: string;
}

export function getSafeApiErrorMessage(error: unknown): string {
  if (!error) return 'Something went wrong. Please try again.';

  const err = error as ApiErrorResponse;
  const status = err.response?.status ?? err.status;
  const data = err.response?.data ?? err.data;
  const code = data?.code;

  if (code === 'CAMPAIGN_WORKER_UNAVAILABLE') {
    return 'Newsletter Worker is unavailable. Wait for it to become active and try again.';
  }
  if (code === 'CAMPAIGN_SMTP_UNAVAILABLE') {
    return 'Newsletter email service is unavailable. Check Worker and SMTP health before resuming.';
  }

  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return 'You do not have permission to perform this action.';
  if (status === 404) return 'The requested resource was not found.';
  if (status === 409) {
    const conflictMessage = data?.message ?? data?.error ?? err.message;
    return conflictMessage && !isUnsafeMessage(conflictMessage)
      ? conflictMessage
      : 'This action cannot be completed in the current status.';
  }
  if (status === 422) return 'Please correct the highlighted information.';
  if (status === 429) return 'Too many requests. Please try again later.';
  if (status === 500) return 'An internal server error occurred. Please try again.';
  if (status === 503) return 'The service is temporarily unavailable. Please try again shortly.';

  const responseMessage = data?.message ?? data?.error;
  if (responseMessage && !isUnsafeMessage(responseMessage)) {
    return responseMessage;
  }

  if (err.message) {
    const normalizedMessage = err.message.toLowerCase();
    if (normalizedMessage.includes('network error') || normalizedMessage.includes('failed to fetch')) {
      return 'Network error. Please check your connection and try again.';
    }
    if (normalizedMessage.includes('timeout')) {
      return 'The request timed out. Please try again.';
    }
  }

  return 'Something went wrong. Please try again.';
}

function isUnsafeMessage(message: string): boolean {
  const normalizedMessage = message.toLowerCase();
  return (
    normalizedMessage.includes('select ') ||
    normalizedMessage.includes('insert into') ||
    normalizedMessage.includes('update ') ||
    normalizedMessage.includes('delete from') ||
    normalizedMessage.includes('sql') ||
    normalizedMessage.includes('trace') ||
    normalizedMessage.includes('smtp') ||
    normalizedMessage.includes('token') ||
    message.includes('/') ||
    message.includes('\\') ||
    normalizedMessage.includes('password')
  );
}
