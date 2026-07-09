// Thin fetch wrapper for the Journal-module Express backend. Attaches the
// stored session JWT (from Firebase Phone-OTP login) as a Bearer token on
// every request, and normalizes error responses into thrown Error objects
// with a readable message.
import { API_BASE_URL } from '../config/api';
import { getSessionToken, clearSessionToken } from '../modules/auth/services/sessionService';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Fired when a request comes back 401 — lets the app react (e.g. force
 *  logout) without every call site needing to check for it. */
let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(fn: (() => void) | null) {
  onUnauthorized = fn;
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const { method = 'GET', body, auth = true } = options;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = await getSessionToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e: any) {
    throw new ApiError(0, `Network error reaching backend (${API_BASE_URL}${path}): ${e?.message ?? e}`);
  }

  if (res.status === 401) {
    await clearSessionToken();
    onUnauthorized?.();
    throw new ApiError(401, 'Session expired — please log in again');
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

export const apiClient = {
  get:   <T>(path: string) => request<T>(path, { method: 'GET' }),
  post:  <T>(path: string, body?: unknown, opts?: { auth?: boolean }) => request<T>(path, { method: 'POST', body, auth: opts?.auth ?? true }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  del:   <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
