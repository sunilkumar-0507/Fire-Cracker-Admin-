/**
 * The demo backend.
 *
 * A build made with `VITE_DEMO_MODE` on has no API behind it — it is a static
 * bundle on a CDN with nothing to write to. This stands in for the API so the
 * nine screens can actually be shown to somebody: it answers the same routes,
 * in the same shapes, from a snapshot of a real seeded API, and holds every
 * write in memory for the life of the tab.
 *
 * It is a demo, not an offline mode. Nothing here survives a refresh, nothing
 * is shared between two people looking at the same URL, and **the passcode
 * check below is a prop**. The real one is the API's `AdminOnlyAttribute`,
 * which is not deployed alongside a static build — so anyone who opens the
 * bundle can read the passcode out of it. That is acceptable for invented data
 * and for nothing else.
 *
 * The fixtures in `fixtures/` are real responses captured from a seeded API,
 * not hand-written JSON, so the shapes cannot drift from the contract by being
 * typed out wrong. Regenerate them with `demo/seed.mjs` and the curl commands
 * in `demo/README.md`.
 */

import bootstrapFixture from './fixtures/bootstrap.json';
import summaryFixture from './fixtures/summary.json';
import ordersFixture from './fixtures/orders.json';
import enquiriesFixture from './fixtures/enquiries.json';
import messagesFixture from './fixtures/messages.json';
import analytics7 from './fixtures/analytics-7.json';
import analytics30 from './fixtures/analytics-30.json';
import analytics90 from './fixtures/analytics-90.json';

import { ORDER_STATUSES, OPEN_STATUSES, ENQUIRY_STATUSES } from '@/constants';
import { DEMO_PASSCODE } from './flags';

export { DEMO_PASSCODE } from './flags';

/* -------------------------------------------------------------------------- */
/* State                                                                       */
/* -------------------------------------------------------------------------- */

const clone = (value) => structuredClone(value);

/* One mutable copy, seeded from the fixtures. Screens write into this and read
   it straight back, which is what makes the demo feel like an application
   rather than a screenshot. */
const db = {
  products: clone(bootstrapFixture.products),
  categories: clone(bootstrapFixture.categories),
  combos: clone(bootstrapFixture.combos),
  offers: clone(bootstrapFixture.offers),
  banners: clone(bootstrapFixture.banners ?? []),
  testimonials: clone(bootstrapFixture.testimonials ?? []),
  faqs: clone(bootstrapFixture.faqs ?? []),
  orders: clone(ordersFixture.items),
  enquiries: clone(enquiriesFixture.items),
  messages: clone(messagesFixture.items),
};

const ANALYTICS = { 7: analytics7, 30: analytics30, 90: analytics90 };

/* -------------------------------------------------------------------------- */
/* Failure                                                                     */
/* -------------------------------------------------------------------------- */

/** Thrown the way the API answers: an RFC 9110 problem details body. */
class DemoProblem extends Error {
  constructor(status, title, detail, errors) {
    super(title);
    this.status = status;
    this.problem = { status, title, detail, ...(errors ? { errors } : {}) };
  }
}

const notFound = (what) => new DemoProblem(404, 'Not found', `No ${what} with that id.`);
const conflict = (detail) => new DemoProblem(409, 'That would break something', detail);

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

const page = (rows, { page: p = 1, pageSize = 50 } = {}) => {
  const size = Number(pageSize) || 50;
  const current = Number(p) || 1;
  const total = rows.length;
  const totalPages = size > 0 ? Math.ceil(total / size) : 0;
  const start = (current - 1) * size;

  return {
    items: rows.slice(start, start + size),
    page: current,
    pageSize: size,
    total,
    totalPages,
    hasPrevious: current > 1,
    hasNext: current < totalPages,
  };
};

const matches = (haystack, needle) =>
  !needle || String(haystack ?? '').toLowerCase().includes(String(needle).toLowerCase());

const byStatus = (rows, status) =>
  !status || status === 'all' ? rows : rows.filter((r) => r.status === status);

/** The next id in a sequence like `p-178`, so a created row looks like the rest. */
const nextId = (rows, prefix) => {
  const highest = rows.reduce((top, row) => {
    const n = Number(String(row.id ?? '').replace(`${prefix}-`, ''));
    return Number.isFinite(n) && n > top ? n : top;
  }, 0);
  return `${prefix}-${String(highest + 1).padStart(3, '0')}`;
};

const slugify = (text) =>
  String(text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * Availability is derived, never stored — the same rule the API and the
 * storefront follow, so a badge cannot disagree with the number beside it.
 */
const availabilityOf = (product) =>
  product.active === false ? 'unavailable' : product.stock > 0 ? 'available' : 'out-of-stock';

const withDerived = (product) => ({
  ...product,
  availability: availabilityOf(product),
  /* Discount is computed from price against MRP, never typed. */
  discount: product.mrp > 0 ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 0,
});

const LOW_STOCK = 25;

/* -------------------------------------------------------------------------- */
/* Summary                                                                     */
/* -------------------------------------------------------------------------- */

/* Recomputed rather than served from the fixture, so deactivating a product or
   advancing an order is visible on the dashboard a click later. */
const buildSummary = () => {
  const orders = db.orders;
  const counted = orders.filter((o) => o.status !== 'cancelled');
  const revenue = counted.reduce((sum, o) => sum + (o.totals?.total ?? 0), 0);

  const weekAgo = Date.now() - 7 * 86_400_000;
  const thisWeek = counted.filter((o) => new Date(o.placedAt).getTime() >= weekAgo);

  const lowStockProducts = db.products
    .filter((p) => p.stock > 0 && p.stock <= LOW_STOCK)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 10)
    .map(withDerived);

  return {
    ...summaryFixture,

    products: db.products.length,
    categories: db.categories.length,
    combos: db.combos.length,
    offers: db.offers.length,

    orders: orders.length,
    revenue,
    pendingOrders: orders.filter((o) => OPEN_STATUSES.includes(o.status)).length,
    ordersThisWeek: thisWeek.length,
    revenueThisWeek: thisWeek.reduce((sum, o) => sum + (o.totals?.total ?? 0), 0),

    outOfStock: db.products.filter((p) => p.active !== false && p.stock <= 0).length,
    unavailable: db.products.filter((p) => p.active === false).length,
    lowStock: db.products.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK).length,
    lowStockProducts,

    byStatus: ORDER_STATUSES.map((status) => ({
      status,
      count: orders.filter((o) => o.status === status).length,
    })),

    recentOrders: [...orders]
      .sort((a, b) => b.placedAt.localeCompare(a.placedAt))
      .slice(0, 6),

    enquiries: db.enquiries.length,
    openEnquiries: db.enquiries.filter((e) => e.status !== 'closed' && e.status !== 'won').length,
    recentEnquiries: [...db.enquiries]
      .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
      .slice(0, 5),
  };
};

/* -------------------------------------------------------------------------- */
/* Routes                                                                      */
/* -------------------------------------------------------------------------- */

const routes = [];

const on = (method, pattern, handler) => {
  const keys = [];
  const regex = new RegExp(
    `^${pattern.replace(/:[a-zA-Z]+/g, (m) => {
      keys.push(m.slice(1));
      return '([^/]+)';
    })}$`,
  );
  routes.push({ method, regex, keys, handler });
};

/* ---- Catalogue ----------------------------------------------------------- */

on('GET', '/bootstrap', () => ({
  products: db.products.map(withDerived),
  categories: db.categories,
  combos: db.combos,
  offers: db.offers,
  banners: db.banners,
  testimonials: db.testimonials,
  faqs: db.faqs,
}));

on('GET', '/admin/summary', () => buildSummary());

on('GET', '/admin/analytics', (_p, query) => {
  const days = Number(query.get('days') ?? 30);
  /* Three windows were captured. Anything else gets the nearest, rather than
     an empty report that would read as "nothing happened". */
  const nearest = [7, 30, 90].reduce((best, d) =>
    Math.abs(d - days) < Math.abs(best - days) ? d : best,
  );
  return { ...ANALYTICS[nearest], days };
});

/* ---- Products ------------------------------------------------------------ */

on('POST', '/admin/products', (_p, _q, body) => {
  const id = nextId(db.products, 'p');
  const product = {
    ...body,
    id,
    slug: body.slug || slugify(body.name),
    tags: body.tags ?? [],
    images: body.images ?? [],
    active: body.active ?? true,
    stock: body.stock ?? 0,
  };
  db.products.push(product);
  return withDerived(product);
});

on('PUT', '/admin/products/:id', (params, _q, body) => {
  const index = db.products.findIndex((p) => p.id === params.id);
  if (index === -1) throw notFound('product');
  db.products[index] = { ...db.products[index], ...body, id: params.id };
  return withDerived(db.products[index]);
});

on('PATCH', '/admin/products/:id/active', (params, _q, body) => {
  const product = db.products.find((p) => p.id === params.id);
  if (!product) throw notFound('product');
  product.active = Boolean(body.active);
  return withDerived(product);
});

on('DELETE', '/admin/products/:id', (params) => {
  const index = db.products.findIndex((p) => p.id === params.id);
  if (index === -1) throw notFound('product');

  /* A delete that would break a combo is refused with a sentence saying why —
     the same rule the API enforces. */
  const holding = db.combos.find((c) =>
    (c.items ?? []).some((item) => (item.id ?? item.productId ?? item) === params.id),
  );
  if (holding) {
    throw conflict(`“${holding.name}” still contains this product. Remove it from the combo first.`);
  }

  db.products.splice(index, 1);
  return null;
});

on('PATCH', '/admin/stock', (_p, _q, body) => {
  const levels = body.levels ?? {};
  let updated = 0;

  for (const [id, value] of Object.entries(levels)) {
    const product = db.products.find((p) => p.id === id);
    if (!product) continue;
    product.stock = Math.max(0, Number(value) || 0);
    updated += 1;
  }

  return { updated, products: db.products.map(withDerived) };
});

/* ---- Categories, combos, offers ------------------------------------------ */

/** The three catalogue collections behave identically, so they are wired once. */
const collection = (name, key, prefix) => {
  on('POST', `/admin/${name}`, (_p, _q, body) => {
    const row = { ...body, id: body.id || nextId(db[key], prefix), slug: body.slug || slugify(body.name) };
    db[key].push(row);
    return row;
  });

  on('PUT', `/admin/${name}/:id`, (params, _q, body) => {
    const index = db[key].findIndex((r) => r.id === params.id || r.slug === params.id);
    if (index === -1) throw notFound(name.replace(/s$/, ''));
    db[key][index] = { ...db[key][index], ...body };
    return db[key][index];
  });

  on('DELETE', `/admin/${name}/:id`, (params) => {
    const index = db[key].findIndex((r) => r.id === params.id || r.slug === params.id);
    if (index === -1) throw notFound(name.replace(/s$/, ''));

    if (key === 'categories') {
      const held = db.products.filter((p) => p.category === db[key][index].slug).length;
      if (held > 0) {
        throw conflict(`“${db[key][index].name}” still holds ${held} products. Move them first.`);
      }
    }

    db[key].splice(index, 1);
    return null;
  });
};

collection('categories', 'categories', 'cat');
collection('combos', 'combos', 'cmb');
collection('offers', 'offers', 'off');

/* ---- Orders -------------------------------------------------------------- */

on('GET', '/admin/orders', (_p, query) => {
  const q = query.get('q');
  const rows = byStatus(db.orders, query.get('status')).filter(
    (o) => matches(o.orderId, q) || matches(o.name, q) || matches(o.phone, q),
  );

  return page(
    [...rows].sort((a, b) => b.placedAt.localeCompare(a.placedAt)),
    { page: query.get('page'), pageSize: query.get('pageSize') },
  );
});

on('GET', '/admin/orders/:orderId', (params) => {
  const order = db.orders.find((o) => o.orderId === params.orderId);
  if (!order) throw notFound('order');
  return order;
});

on('PATCH', '/admin/orders/:orderId/status', (params, _q, body) => {
  const order = db.orders.find((o) => o.orderId === params.orderId);
  if (!order) throw notFound('order');

  if (!ORDER_STATUSES.includes(body.status)) {
    throw new DemoProblem(400, 'Unknown status', `Valid: ${ORDER_STATUSES.join(', ')}.`);
  }

  order.status = body.status;
  order.history = [
    ...(order.history ?? []),
    { status: body.status, at: new Date().toISOString(), note: body.note ?? null },
  ];
  return order;
});

/* ---- Enquiries and messages ---------------------------------------------- */

on('GET', '/admin/enquiries', (_p, query) => {
  const q = query.get('q');
  const rows = byStatus(db.enquiries, query.get('status')).filter(
    (e) => matches(e.name, q) || matches(e.organisation, q) || matches(e.phone, q) || matches(e.district, q),
  );

  return page(
    [...rows].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)),
    { page: query.get('page'), pageSize: query.get('pageSize') },
  );
});

on('GET', '/admin/enquiries/:id', (params) => {
  const enquiry = db.enquiries.find((e) => e.enquiryId === params.id);
  if (!enquiry) throw notFound('enquiry');
  return enquiry;
});

on('PATCH', '/admin/enquiries/:id/status', (params, _q, body) => {
  const enquiry = db.enquiries.find((e) => e.enquiryId === params.id);
  if (!enquiry) throw notFound('enquiry');

  if (!ENQUIRY_STATUSES.includes(body.status)) {
    throw new DemoProblem(400, 'Unknown status', `Valid: ${ENQUIRY_STATUSES.join(', ')}.`);
  }

  enquiry.status = body.status;
  return enquiry;
});

on('GET', '/admin/messages', (_p, query) =>
  page(
    [...db.messages].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)),
    { page: query.get('page'), pageSize: query.get('pageSize') },
  ),
);

/* -------------------------------------------------------------------------- */
/* Transport                                                                   */
/* -------------------------------------------------------------------------- */

/* Enough of a pause that spinners and disabled buttons are visible, which is
   part of what is being demonstrated, without being a wait. */
const LATENCY = 120;

/**
 * Answers the way `fetch` would, as `{ status, payload }` — `request()` in
 * `lib/api.js` turns a 4xx into the same ApiError a real response would.
 */
export const demoRequest = async (path, { method = 'GET', body, anonymous = false, passcode } = {}) => {
  await new Promise((resolve) => setTimeout(resolve, LATENCY));

  const [pathname, search = ''] = path.split('?');
  const query = new URLSearchParams(search);

  if (!anonymous && passcode !== DEMO_PASSCODE) {
    return {
      status: 401,
      payload: {
        status: 401,
        title: 'Admin passcode required',
        detail: 'That passcode was not accepted.',
      },
    };
  }

  for (const route of routes) {
    if (route.method !== method) continue;
    const found = route.regex.exec(pathname);
    if (!found) continue;

    const params = Object.fromEntries(route.keys.map((key, i) => [key, decodeURIComponent(found[i + 1])]));

    try {
      const payload = route.handler(params, query, body ?? {});
      return { status: payload === null ? 204 : 200, payload };
    } catch (error) {
      if (error instanceof DemoProblem) return { status: error.status, payload: error.problem };
      throw error;
    }
  }

  return {
    status: 404,
    payload: {
      status: 404,
      title: 'Not found',
      detail: `The demo has no ${method} ${pathname}.`,
    },
  };
};

export default demoRequest;
