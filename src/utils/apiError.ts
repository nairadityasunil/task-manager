import axios from 'axios';

export interface NormalizedApiError {
  message: string;
  code: string;
  status?: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const normalizeApiError = (error: unknown): NormalizedApiError => {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data;

    if (isRecord(responseData)) {
      const message =
        typeof responseData.message === 'string'
          ? responseData.message
          : typeof responseData.error === 'string'
            ? responseData.error
            : error.message;
      const code =
        typeof responseData.code === 'string'
          ? responseData.code
          : `HTTP_${error.response?.status ?? 'UNKNOWN'}`;

      return {
        message,
        code,
        status: error.response?.status
      };
    }

    return {
      message: error.message || 'Request failed',
      code: `HTTP_${error.response?.status ?? 'UNKNOWN'}`,
      status: error.response?.status
    };
  }

  // Already normalized (e.g. passed through twice).
  if (isRecord(error) && typeof error.message === 'string' && typeof error.code === 'string' && !(error instanceof Error)) {
    return {
      message: error.message,
      code: error.code,
      status: typeof error.status === 'number' ? error.status : undefined
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      code: 'UNKNOWN_ERROR'
    };
  }

  return {
    message: 'Something went wrong. Please try again.',
    code: 'UNKNOWN_ERROR'
  };
};

/**
 * The request came from a session the server treats as an automated agent
 * (a script or automated browser on a person's login), on an endpoint only
 * people may use: sign-in, credentials and agent governance.
 */
export const isAgentForbidden = (error: unknown): boolean =>
  axios.isAxiosError(error) &&
  error.response?.status === 403 &&
  isRecord(error.response.data) &&
  error.response.data.error === 'agent_forbidden';

export const toDisplayErrorMessage = (error: unknown): string =>
  normalizeApiError(error).message;
