export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

interface ApiRequestOptions extends RequestInit {
  skipJson?: boolean;
}

export async function apiRequest<T = unknown>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { skipJson = false, headers, ...restOptions } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const errorJson = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(errorJson.message)) {
        message = errorJson.message.join(', ');
      } else if (typeof errorJson.message === 'string') {
        message = errorJson.message;
      }
    } catch {
      // Keep default message if backend did not return JSON.
    }
    throw new ApiError(response.status, message);
  }

  if (skipJson || response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}
