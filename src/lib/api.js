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
  // A file goes as multipart, and the browser has to write that Content-Type
  // itself — the boundary it chooses is part of the header.
  const isForm = body instanceof FormData;
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  // Every admin call is authenticated. The flag exists for `/api/bootstrap`,
  // which is the same public catalogue the shop reads.
  if (!anonymous) headers['X-Admin-Passcode'] = adminPasscode.get();

  let response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      headers,
      signal,
      body: body === undefined || isForm ? body : JSON.stringify(body),
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

  /**
   * Stores one photo on the API and returns `{ url, fileName }`. The `url` is
   * absolute, and goes into a product's `images` exactly as it comes back.
   */
  uploads: {
    image: (file) => {
      const form = new FormData();
      form.append('file', file, file.name);
      return request('/admin/uploads', { method: 'POST', body: form });
    },
  },

  stock: {
    save: (levels) => request('/admin/stock', { method: 'PATCH', body: { levels } }),
  },

  /**
   * What came in, what sold, and what is left.
   *
   * The report is derived on every call rather than stored, so it is always of
   * one moment — there is no cached total to go stale against the ledger.
   */
  inventory: {
    report: (params = {}, signal) => request(`/admin/inventory${qs(params)}`, { signal }),
    intake: (signal) => request('/admin/inventory/intake', { signal }),
    /** Records a delivery. A negative quantity writes off breakage or a miscount. */
    record: (body) => request('/admin/inventory/intake', { method: 'POST', body }),
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

    /**
     * The status vocabulary, asked for rather than mirrored.
     *
     * The admin and the API have to agree on these words exactly: a filter or
     * a button offering a status the API does not know is a dead control, and
     * one missing a status the API added is a state no one here can reach.
     * Keeping a copy in constants/ made that drift silent, so the live list
     * wins — see lib/statuses.js, which falls back to the copy when the call
     * fails so the screen still works rather than rendering an empty dropdown.
     */
    statuses: (signal) => request('/admin/orders/statuses', { signal }),

    get: (orderId) => request(`/admin/orders/${orderId}`),
    /** `note` is optional and appears on the customer's tracking page. */
    setStatus: (orderId, status, note) =>
      request(`/admin/orders/${orderId}/status`, { method: 'PATCH', body: { status, note } }),
  },

  enquiries: {
    list: (params = {}) => request(`/admin/enquiries${qs(params)}`),

    /** The enquiry vocabulary, for the reasons on `orders.statuses` above. */
    statuses: (signal) => request('/admin/enquiries/statuses', { signal }),

    get: (id) => request(`/admin/enquiries/${id}`),
    setStatus: (id, status) =>
      request(`/admin/enquiries/${id}/status`, { method: 'PATCH', body: { status } }),
  },

  messages: {
    list: (params = {}) => request(`/admin/messages${qs(params)}`),
  },

  /**
   * The newsletter list.
   *
   * `remove` is the shop's own unsubscribe. The address goes in the path, so
   * it is encoded — an email full of dots and an @ is not a path segment until
   * somebody makes it one.
   */
  subscribers: {
    list: (params = {}) => request(`/admin/subscribers${qs(params)}`),
    remove: (email) =>
      request(`/admin/subscribers/${encodeURIComponent(email)}`, { method: 'DELETE' }),
  },

  /**
   * Where the shop's data is kept.
   *
   * The API runs on its JSON files until a connection string is configured,
   * and on MySQL once one is. `status` is what tells the two apart from the
   * outside, and the only one of these that is safe to call on a schedule:
   * the other three change something.
   *
   * `migrate` and `seed` answer 409 with a sentence when there is no database,
   * which `ApiError.message` carries straight to a toast.
   */
  database: {
    status: (signal) => request('/admin/database', { signal }),
    backends: (signal) => request('/admin/database/backends', { signal }),
    /** Applies pending schema migrations. Startup does this unless AutoMigrate is off. */
    migrate: () => request('/admin/database/migrate', { method: 'POST' }),
    /**
     * Fills empty tables from the JSON catalogue. `overwrite` replaces the
     * catalogue with the files' version — it never touches orders, the stock
     * ledger or analytics.
     */
    seed: (overwrite = false) =>
      request('/admin/database/seed', { method: 'POST', body: { overwrite } }),
    /** Re-reads the catalogue, for rows changed in the database directly. */
    reload: () => request('/admin/database/reload', { method: 'POST' }),
    /** Everything the shop knows, in one JSON document. */
    export: (signal) => request('/admin/database/export', { signal }),
  },
};

export default adminApi;
