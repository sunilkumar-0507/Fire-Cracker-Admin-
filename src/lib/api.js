/**
 * The admin's REST client.
 *
 * This is the whole of the admin's connection to the rest of the system. There
 * is no shared bundle with the storefront, no shared store and no shared
 * module — the two applications meet here, at an HTTP contract, and nowhere
 * else. Changing the shop cannot break the order book except by changing the
 * API, which is exactly the coupling worth having.
 *
 * The API returns RFC 9110 problem details on failure, so a 409 from the
 * catalogue arrives carrying a sentence written for a shopkeeper ("Sparklers
 * still holds 30 products"). `ApiError.message` is that sentence, which is why
 * screens can render `err.message` straight into a toast.
 */

import { DEMO } from '@/demo/flags';

/** Vite inlines this at build time; the proxy in vite.config.js covers dev. */
const BASE = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');

const PASSCODE_KEY = 'gopi.admin.passcode';

export class ApiError extends Error {
  constructor(message, { status, problem } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.problem = problem;
    /** Field-level messages from a 400, keyed by property name. */
    this.errors = problem?.errors ?? null;
  }

  /** True when the passcode is missing or wrong, so the gate can re-prompt. */
  get unauthorised() {
    return this.status === 401;
  }
}

/* -------------------------------------------------------------------------- */
/* The passcode                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Kept in `sessionStorage`, so it dies with the tab rather than lingering on a
 * shared machine. This is a shared passcode on a local network, not a session
 * token — see the note on AdminOnlyAttribute in the API.
 */
export const adminPasscode = {
  get: () => {
    try {
      return sessionStorage.getItem(PASSCODE_KEY) ?? '';
    } catch {
      return '';
    }
  },
  set: (value) => {
    try {
      sessionStorage.setItem(PASSCODE_KEY, value);
    } catch {
      /* Private mode, or storage disabled — the passcode just won't persist. */
    }
  },
  clear: () => {
    try {
      sessionStorage.removeItem(PASSCODE_KEY);
    } catch {
      /* As above. */
    }
  },
};

/* -------------------------------------------------------------------------- */
/* Request                                                                     */
/* -------------------------------------------------------------------------- */

const UNREACHABLE = 'Could not reach the API. Is it running?';

/**
 * Turns a problem-details body into the one sentence worth showing. Field
 * errors are joined because a form that rejects three fields should say all
 * three, not just the first.
 */
const messageFrom = (problem, status) => {
  // A dev-server proxy with nothing behind it answers 502/504 itself, so a
  // stopped API arrives as a gateway error rather than a failed fetch. Both
  // mean the same thing to whoever is reading the screen.
  if (status === 502 || status === 503 || status === 504) return UNREACHABLE;

  if (!problem) return `Request failed (${status})`;

  const fields = problem.errors
    ? Object.values(problem.errors).flat().filter(Boolean)
    : [];

  if (fields.length) return fields.join(' ');
  return problem.detail || problem.title || `Request failed (${status})`;
};

const request = async (path, { method = 'GET', body, anonymous = false, signal } = {}) => {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  // Every admin call is authenticated. The flag exists for `/api/bootstrap`,
  // which is the same public catalogue the shop reads.
  if (!anonymous) headers['X-Admin-Passcode'] = adminPasscode.get();

  /* Tested against `import.meta.env` directly rather than the imported `DEMO`.
     Vite replaces this with a literal, so a normal build reads `if (undefined)`,
     drops the branch, and never emits the demo chunk at all — whereas a flag
     imported from another module leaves Rollup emitting a quarter of a megabyte
     of invented customers into a production deployment that never loads it. */
  if (import.meta.env.VITE_DEMO_MODE) {
    const { demoRequest } = await import('@/demo/demoApi');
    const { status, payload } = await demoRequest(path, {
      method,
      body,
      anonymous,
      passcode: adminPasscode.get(),
    });

    if (status === 204) return null;
    if (status >= 400) {
      throw new ApiError(messageFrom(payload, status), { status, problem: payload });
    }
    return payload;
  }

  let response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      headers,
      signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (cause) {
    if (cause?.name === 'AbortError') throw cause;
    throw new ApiError(UNREACHABLE, { status: 0 });
  }

  if (response.status === 204) return null;

  const isJson = (response.headers.get('content-type') ?? '').includes('json');
  const payload = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    throw new ApiError(messageFrom(payload, response.status), {
      status: response.status,
      problem: payload,
    });
  }

  return payload;
};

/* -------------------------------------------------------------------------- */
/* Admin                                                                       */
/* -------------------------------------------------------------------------- */

const qs = (params = {}) => {
  const search = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== '' && v != null),
  ).toString();
  return search ? `?${search}` : '';
};

export const adminApi = {
  /** A cheap authenticated call, used by the gate to check a passcode. */
  verify: () => request('/admin/summary'),

  summary: () => request('/admin/summary'),

  /** The whole catalogue in one round trip. Public, so it needs no passcode. */
  bootstrap: (signal) => request('/bootstrap', { anonymous: true, signal }),

  /** Product views, basket activity, searches and the order funnel. */
  analytics: (days = 30, signal) => request(`/admin/analytics${qs({ days })}`, { signal }),

  products: {
    create: (body) => request('/admin/products', { method: 'POST', body }),
    update: (id, body) => request(`/admin/products/${id}`, { method: 'PUT', body }),
    remove: (id) => request(`/admin/products/${id}`, { method: 'DELETE' }),
    /**
     * The activate / deactivate switch. Its own call rather than a full PUT,
     * so flipping one product on or off cannot save a stale copy of every
     * other field alongside it.
     */
    setActive: (id, active) =>
      request(`/admin/products/${id}/active`, { method: 'PATCH', body: { active } }),
  },

  stock: {
    save: (levels) => request('/admin/stock', { method: 'PATCH', body: { levels } }),
  },

  categories: {
    create: (body) => request('/admin/categories', { method: 'POST', body }),
    update: (id, body) => request(`/admin/categories/${id}`, { method: 'PUT', body }),
    remove: (id) => request(`/admin/categories/${id}`, { method: 'DELETE' }),
  },

  combos: {
    create: (body) => request('/admin/combos', { method: 'POST', body }),
    update: (id, body) => request(`/admin/combos/${id}`, { method: 'PUT', body }),
    remove: (id) => request(`/admin/combos/${id}`, { method: 'DELETE' }),
  },

  offers: {
    create: (body) => request('/admin/offers', { method: 'POST', body }),
    update: (id, body) => request(`/admin/offers/${id}`, { method: 'PUT', body }),
    remove: (id) => request(`/admin/offers/${id}`, { method: 'DELETE' }),
  },

  orders: {
    list: (params = {}) => request(`/admin/orders${qs(params)}`),
    get: (orderId) => request(`/admin/orders/${orderId}`),
    /** `note` is optional and appears on the customer's tracking page. */
    setStatus: (orderId, status, note) =>
      request(`/admin/orders/${orderId}/status`, { method: 'PATCH', body: { status, note } }),
  },

  enquiries: {
    list: (params = {}) => request(`/admin/enquiries${qs(params)}`),
    get: (id) => request(`/admin/enquiries/${id}`),
    setStatus: (id, status) =>
      request(`/admin/enquiries/${id}/status`, { method: 'PATCH', body: { status } }),
  },

  messages: {
    list: (params = {}) => request(`/admin/messages${qs(params)}`),
  },
};

export { DEMO };

export default adminApi;
