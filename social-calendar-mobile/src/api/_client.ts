/**
 * Shared API client — typed fetch wrapper for the SyncUp backend.
 *
 * Base URL
 *   Set EXPO_PUBLIC_API_URL in .env (or .env.local) before running.
 *   Defaults to the local Docker stack: http://localhost:3000.
 *
 *   Example .env entry:
 *     EXPO_PUBLIC_API_URL=http://localhost:3000
 *
 * Authentication
 *   Every request requires a Bearer token (Clerk JWT). The DRY entry point
 *   for query files is `useApiFetch()` — it calls `useAuth().getToken()`
 *   internally and returns a pre-authorized fetch.
 *
 *     // In any query hook:
 *     const authedFetch = useApiFetch();
 *     return useQuery({ queryFn: () => fetchSomething(authedFetch) });
 *
 *   `apiFetch(path, token?)` remains exported for paths that genuinely
 *   need to bypass the hook (e.g. callers outside React) and for the
 *   EXPO_PUBLIC_DEV_TOKEN fallback used for local-dev testing without a
 *   live Clerk session.
 *
 * Error mapping
 *   HTTP 4xx/5xx → ApiError (from ./_utils) with a typed `code` so
 *   React Query's onError handlers can render the right ErrorToast preset.
 */

import { useCallback } from 'react';
import { useAuth } from '@clerk/clerk-expo';

import { ApiError, type ApiErrorCode } from './_utils';

const API_BASE =
  // Expo env vars must be prefixed with EXPO_PUBLIC_ to be bundled.
  (process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3000').replace(/\/$/, '');

/** Dev-only token for exercising the real backend before Clerk is wired up. */
const DEV_TOKEN = process.env['EXPO_PUBLIC_DEV_TOKEN'] ?? '';

function statusToCode(status: number): ApiErrorCode {
  if (status === 404) return 'NOT_FOUND';
  if (status === 403) return 'FORBIDDEN';
  if (status === 409) return 'CONFLICT';
  if (status >= 500) return 'SERVER_ERROR';
  return 'SERVER_ERROR';
}

/**
 * Authenticated GET request to the SyncUp API.
 *
 * @param path  Path including query string, e.g. `/explore/feed?lat=…`
 * @param token Bearer token from Clerk (or DEV_TOKEN in local dev).
 */
export async function apiFetch<T>(path: string, token?: string): Promise<T> {
  const bearerToken = token ?? DEV_TOKEN;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
      },
    });
  } catch {
    throw new ApiError('OFFLINE', `Network error fetching ${path}`);
  }

  if (!res.ok) {
    throw new ApiError(
      statusToCode(res.status),
      `API ${path} responded ${res.status}`,
    );
  }

  return res.json() as Promise<T>;
}

/** HTTP methods accepted by `apiMutate`. GET is intentionally excluded — use `apiFetch`. */
export type MutateMethod = 'POST' | 'PATCH' | 'PUT' | 'DELETE';

/**
 * Authenticated mutating request to the SyncUp API.
 *
 * Mirrors `apiFetch`'s contract for the write side. JSON body is optional —
 * DELETE calls in particular often have none. A 204 No Content response is
 * returned as `undefined` cast to `T`; callers that expect a body must use
 * a method/endpoint that returns one.
 *
 * @param method HTTP verb.
 * @param path   Path including query string, e.g. `/events/123/rsvp`.
 * @param body   Optional JSON-serializable body.
 * @param token  Bearer token from Clerk (or DEV_TOKEN in local dev).
 */
export async function apiMutate<T>(
  method: MutateMethod,
  path: string,
  body?: unknown,
  token?: string,
): Promise<T> {
  const bearerToken = token ?? DEV_TOKEN;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new ApiError('OFFLINE', `Network error mutating ${path}`);
  }

  if (!res.ok) {
    throw new ApiError(
      statusToCode(res.status),
      `API ${method} ${path} responded ${res.status}`,
    );
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

/** True when the app has a real API URL configured (not falling back to mocks). */
export function isApiConfigured(): boolean {
  return Boolean(process.env['EXPO_PUBLIC_API_URL'] || process.env['EXPO_PUBLIC_DEV_TOKEN']);
}

/** A pre-authorized fetch — same shape as apiFetch but with the token already injected. */
export type AuthedFetch = <T>(path: string) => Promise<T>;

/** A pre-authorized mutate — same shape as apiMutate but with the token already injected. */
export type AuthedMutate = <T>(method: MutateMethod, path: string, body?: unknown) => Promise<T>;

/**
 * Single DRY hook. Call this in any React Query hook that needs the API.
 * It pulls the Clerk session token via `useAuth()` and hands back a fetch
 * function that injects the Bearer header automatically.
 *
 * The returned fetch is stable per `getToken` reference, so it can be
 * passed straight into `queryFn` without creating a new closure each render.
 */
export function useApiFetch(): AuthedFetch {
  const { getToken } = useAuth();
  return useCallback(
    async <T>(path: string): Promise<T> => {
      const token = await getToken();
      return apiFetch<T>(path, token ?? undefined);
    },
    [getToken],
  );
}

/**
 * Mutation-side mirror of `useApiFetch`. Call from any React Query mutation
 * hook (`useMutation`) and pass the result into `mutationFn`.
 *
 *   const authedMutate = useApiMutate();
 *   useMutation({
 *     mutationFn: (eventId: string) =>
 *       authedMutate<void>('DELETE', `/events/${eventId}`),
 *   });
 */
export function useApiMutate(): AuthedMutate {
  const { getToken } = useAuth();
  return useCallback(
    async <T>(method: MutateMethod, path: string, body?: unknown): Promise<T> => {
      const token = await getToken();
      return apiMutate<T>(method, path, body, token ?? undefined);
    },
    [getToken],
  );
}
