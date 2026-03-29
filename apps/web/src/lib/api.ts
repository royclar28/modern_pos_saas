/**
 * api.ts — Centralized Fetch Wrapper (replaces all raw fetch() calls)
 *
 * Single source of truth for:
 *   1. Base URL (VITE_API_URL env variable)
 *   2. Auth token injection (Bearer from localStorage)
 *   3. Accept: application/json header
 *   4. Automatic 401 handling (logout on expired token)
 *
 * Usage:
 *   import { api } from '@/lib/api';
 *   const data = await api.get('/items');
 *   await api.post('/sync/events', { events: [...] });
 *   await api.patch('/settings', { company: 'New Name' });
 *   await api.postForm('/inventory/scan-invoice', formData);
 */

// ─── Base URL Resolution ─────────────────────────────────────────────────────

function getBaseUrl(): string {
    let url = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';
    // If accessing from another device on the LAN, swap localhost for the actual hostname
    if (window.location.hostname !== 'localhost' && url.includes('localhost')) {
        url = url.replace('localhost', window.location.hostname);
    }
    return url;
}

// ─── Token Accessor ──────────────────────────────────────────────────────────

function getToken(): string | null {
    return localStorage.getItem('pos_token') || localStorage.getItem('pos_api_token');
}

// ─── 401 Handler ─────────────────────────────────────────────────────────────

let onUnauthorized: (() => void) | null = null;

/**
 * Register a callback to execute when a 401 is received (e.g. AuthProvider.logout).
 * Must be called once from AuthProvider on mount.
 */
export function registerLogoutHandler(handler: () => void): void {
    onUnauthorized = handler;
}

// ─── Core Fetch Wrapper ──────────────────────────────────────────────────────

type ApiOptions = Omit<RequestInit, 'headers'> & {
    /** Extra headers to merge (Authorization + Accept are automatic) */
    headers?: Record<string, string>;
    /** Skip the 401 auto-logout (e.g. for the login request itself) */
    skipAuthCheck?: boolean;
};

async function request<T = any>(path: string, options: ApiOptions = {}): Promise<T> {
    const { headers: extra = {}, skipAuthCheck = false, ...fetchOpts } = options;
    const token = getToken();

    const headers: Record<string, string> = {
        'Accept': 'application/json',
        ...extra,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Don't set Content-Type for FormData — the browser does it automatically with boundary
    if (!(fetchOpts.body instanceof FormData) && !headers['Content-Type'] && fetchOpts.method !== 'GET') {
        headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${getBaseUrl()}${path}`, {
        ...fetchOpts,
        headers,
    });

    // Handle 401 — session expired
    if (res.status === 401 && !skipAuthCheck) {
        console.warn('[API] 401 Unauthorized — session expired, logging out');
        onUnauthorized?.();
        throw new Error('Session expired');
    }

    if (!res.ok) {
        const errorText = await res.text().catch(() => 'No response body');
        throw new Error(`HTTP ${res.status}: ${errorText}`);
    }

    // Some endpoints return 204 No Content
    if (res.status === 204) return undefined as T;

    return res.json();
}

// ─── Convenience Methods ─────────────────────────────────────────────────────

export const api = {
    get: <T = any>(path: string, opts?: ApiOptions) =>
        request<T>(path, { ...opts, method: 'GET' }),

    post: <T = any>(path: string, body?: any, opts?: ApiOptions) =>
        request<T>(path, { ...opts, method: 'POST', body: body ? JSON.stringify(body) : undefined }),

    patch: <T = any>(path: string, body?: any, opts?: ApiOptions) =>
        request<T>(path, { ...opts, method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),

    delete: <T = any>(path: string, opts?: ApiOptions) =>
        request<T>(path, { ...opts, method: 'DELETE' }),

    /** For file uploads (FormData) — does NOT set Content-Type */
    postForm: <T = any>(path: string, formData: FormData, opts?: ApiOptions) =>
        request<T>(path, { ...opts, method: 'POST', body: formData }),

    /** Raw request with full control */
    request,

    /** Get the resolved base URL (useful for debugging) */
    getBaseUrl,
};
