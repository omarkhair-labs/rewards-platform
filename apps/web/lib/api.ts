const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');
// The standalone review build should work without infrastructure. API teams opt
// into live requests explicitly once their endpoint is ready.
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';

export type ApiErrorPayload = {
  error?: string;
  issues?: unknown;
};

export class ApiError extends Error {
  constructor(public status: number, message: string, public payload?: ApiErrorPayload) {
    super(message);
  }
}

export function getToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('rewards_token');
}

export function setToken(token: string) {
  window.localStorage.setItem('rewards_token', token);
}

export function clearToken() {
  window.localStorage.removeItem('rewards_token');
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  if (DEMO_MODE) {
    const { demoApiFetch } = await import('./demo-api');
    return demoApiFetch<T>(path, options);
  }
  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');

  const body = options.body;
  if (body && !(body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.auth !== false) {
    const token = getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    cache: 'no-store'
  });

  if (!response.ok) {
    let payload: ApiErrorPayload | undefined;
    try {
      payload = await response.json();
    } catch {}
    throw new ApiError(response.status, payload?.error || `Request failed (${response.status})`, payload);
  }

  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json() as Promise<T>;
  }

  return (await response.text()) as T;
}

export function formatPoints(value: unknown) {
  try {
    return new Intl.NumberFormat('en-US').format(BigInt(String(value ?? 0)));
  } catch {
    return '0';
  }
}
