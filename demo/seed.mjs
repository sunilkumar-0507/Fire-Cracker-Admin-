#!/usr/bin/env node
/**
 * Demo seed for a client walkthrough.
 *
 * Fills a running API with a plausible fortnight of trade — orders across every
 * status, bulk enquiries, contact messages, and the browsing that produced them
 * — so the admin's nine screens have something to show instead of nine empty
 * states.
 *
 * Nothing here is hand-priced. A basket is ids and quantities; the API prices
 * it, assigns the reference and records `order_placed` itself, down the same
 * path the storefront checkout takes. The demo's numbers are therefore whatever
 * today's catalogue actually says, and cannot drift out of step with it.
 *
 *   node demo/seed.mjs                              # API running
 *   node demo/seed.mjs --backdate --data <path>     # API stopped
 *
 * The API stamps its own clock on everything it stores, on purpose — a browser
 * must not be able to claim an order happened last Tuesday. So the first pass
 * lands entirely on today, and the second pass spreads those timestamps back
 * across the preceding fortnight by rewriting the two journals on disk. It
 * moves dates and nothing else: every rupee stays exactly as the API worked it
 * out, and an order's analytics stay attached to the order.
 *
 * Everyone in this data is invented. The mobile numbers run sequentially from
 * 9000000001 so they read as placeholders, and the addresses are the shop's own
 * town.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

/* -------------------------------------------------------------------------- */
/* Arguments                                                                   */
/* -------------------------------------------------------------------------- */

const args = process.argv.slice(2);
const flag = (name, fallback = undefined) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const has = (name) => args.includes(`--${name}`);

const API = flag('api', process.env.DEMO_API ?? 'http://localhost:5080').replace(/\/$/, '');
const PASSCODE = flag('passcode', process.env.ADMIN_PASSCODE ?? 'gopi-demo-2026');
const DAYS = Number(flag('days', '14'));

/* -------------------------------------------------------------------------- */
/* A seeded PRNG, so two runs of this script produce the same demo             */
/* -------------------------------------------------------------------------- */

let seed = 20260101;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = (list) => list[Math.floor(rand() * list.length)];
const between = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));

/* -------------------------------------------------------------------------- */
/* HTTP                                                                        */
/* -------------------------------------------------------------------------- */

const admin = { 'X-Admin-Passcode': PASSCODE };

async function call(method, route, body, headers = {}) {
  const res = await fetch(`${API}${route}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  const payload = text ? JSON.parse(text) : null;

  if (!res.ok) {
    /* A ValidationProblemDetails carries the reason per field, and the title
       alone ("The order could not be placed") says nothing useful. */
    const fields = Object.entries(payload?.errors ?? {})
      .map(([field, messages]) => `\n    ${field}: ${[].concat(messages).join('; ')}`)
      .join('');
    const detail = payload?.detail ?? payload?.title ?? text;
    throw new Error(`${method} ${route} → ${res.status}: ${detail}${fields}`);
  }
  return payload;
}

const get = (route) => call('GET', route);
const post = (route, body, headers) => call('POST', route, body, headers);
const patch = (route, body, headers) => call('PATCH', route, body, headers);

/* -------------------------------------------------------------------------- */
/* The cast                                                                    */
/* -------------------------------------------------------------------------- */

/* Sequential numbers rather than plausible ones: this file is public, and a
   convincing mobile number is somebody's. */
let nextPhone = 9000000001;
const phone = () => String(nextPhone++);

const CUSTOMERS = [
  { name: 'Priya Subramanian', city: 'Sivakasi', district: 'Virudhunagar', pincode: '626123' },
  { name: 'Karthik Rajendran', city: 'Madurai', district: 'Madurai', pincode: '625001' },
  { name: 'Meenakshi Sundaram', city: 'Virudhunagar', district: 'Virudhunagar', pincode: '626001' },
  { name: 'Arun Prakash', city: 'Coimbatore', district: 'Coimbatore', pincode: '641001' },
  { name: 'Lakshmi Narayanan', city: 'Tirunelveli', district: 'Tirunelveli', pincode: '627001' },
  { name: 'Senthil Kumar', city: 'Sattur', district: 'Virudhunagar', pincode: '626203' },
  { name: 'Divya Ramesh', city: 'Chennai', district: 'Chennai', pincode: '600001' },
  { name: 'Mohan Raj', city: 'Dindigul', district: 'Dindigul', pincode: '624001' },
  { name: 'Anitha Selvam', city: 'Rajapalayam', district: 'Virudhunagar', pincode: '626117' },
  { name: 'Vignesh Balaji', city: 'Trichy', district: 'Tiruchirappalli', pincode: '620001' },
  { name: 'Revathi Krishnan', city: 'Salem', district: 'Salem', pincode: '636001' },
  { name: 'Suresh Pandian', city: 'Thoothukudi', district: 'Thoothukudi', pincode: '628001' },
];

const STREETS = [
  '14/3 Sattur Main Road',
  '27 Thiruvalluvar Street',
  '9A Kamarajar Salai',
  '112 Bazaar Street',
  '4/56 Gandhi Nagar',
  '78 Anna Salai',
  '23 Meenakshi Koil Street',
  '61 North Car Street',
];

const address = (c) => `${pick(STREETS)}, ${c.city}, ${c.district} District, Tamil Nadu ${c.pincode}`;

/* The status each seeded order ends on, and the note recorded against the move.
   Weighted towards the open end, because a dashboard whose queue is empty
   demonstrates nothing. */
const JOURNEYS = [
  { status: 'pending' },
  { status: 'pending' },
  { status: 'confirmed', note: 'Payment received by UPI' },
  { status: 'confirmed', note: 'Called to confirm the delivery window' },
  { status: 'processing', note: 'Packing started' },
  { status: 'processing', note: 'Packed, awaiting the lorry' },
  { status: 'ready', note: 'Loaded — lorry TN 67 AB 4412' },
  { status: 'ready', note: 'Waiting at the counter' },
  { status: 'completed', note: 'Delivered and signed for' },
  { status: 'completed', note: 'Collected from the counter' },
  { status: 'completed', note: 'Delivered' },
  { status: 'cancelled', note: 'Customer asked to cancel — changed their date' },
];

const ENQUIRIES = [
  {
    name: 'Ravi Chandrasekar',
    organisation: 'Sri Meenakshi Matriculation School',
    district: 'Madurai',
    budget: '₹50,000 – ₹75,000',
    quantity: 'About 40 gift boxes',
    message:
      'Annual day on the 12th. We need gift boxes for prize winners and a few ground items for the display. Can you quote for delivery to the school?',
    status: 'quoted',
  },
  {
    name: 'Fathima Beevi',
    organisation: 'Crescent Traders',
    district: 'Virudhunagar',
    budget: 'Above ₹1,00,000',
    quantity: '200+ assorted boxes',
    message:
      'We retail in Rajapalayam and want to stock your one-sound range and flower pots for the season. What are your wholesale rates and minimum order?',
    status: 'won',
  },
  {
    name: 'Ganesh Moorthy',
    organisation: 'Vetri Apartments Association',
    district: 'Coimbatore',
    budget: '₹25,000 – ₹50,000',
    quantity: 'Enough for 60 families',
    message:
      'Apartment Diwali celebration. Mostly low-noise and kids items please — we have elderly residents and pets in the block.',
    status: 'received',
  },
  {
    name: 'Bhuvaneswari Raman',
    organisation: 'Bharath Textiles',
    district: 'Tiruppur',
    budget: '₹75,000 – ₹1,00,000',
    quantity: '150 employee gift packs',
    message:
      'Staff Diwali gifts. Identical packs, something in the ₹500 range each, and we would like our company name on the box if that is possible.',
    status: 'quoted',
  },
  {
    name: 'Jeyaraman Pillai',
    organisation: null,
    district: 'Thoothukudi',
    budget: 'Under ₹25,000',
    quantity: 'Family function',
    message:
      'House warming next month. Want a good mix but nothing too loud, the house is on a narrow street.',
    status: 'closed',
  },
];

const MESSAGES = [
  {
    name: 'Nandhini Kumar',
    subject: 'Delivery to Bangalore',
    message:
      'Do you deliver outside Tamil Nadu? I am in Bangalore and would like to order for my parents in Sivakasi, delivered to their house.',
  },
  {
    name: 'Prakash Venkat',
    subject: 'Safety of the gift boxes',
    message:
      'My children are 6 and 9. Which of the gift boxes would you say is genuinely suitable for that age, with supervision?',
  },
  {
    name: 'Sathish Kumar',
    subject: 'Bulk rate for 100 boxes',
    message:
      'What is the rate if I take 100 of the family gift boxes? Collecting from the counter myself, no delivery needed.',
  },
  {
    name: 'Kalaiselvi Murugan',
    subject: 'Order not showing on tracking',
    message:
      'I placed an order two days ago and the tracking page says not found. I have the reference but perhaps I typed the phone number differently. Can you check?',
  },
];

const SEARCHES = [
  ['flower pot', 12],
  ['rocket', 8],
  ['gift box', 15],
  ['sparkler', 9],
  ['bijili', 6],
  ['chakkaram', 7],
  ['kids', 11],
  ['silent crackers', 4],
  ['ground spinner', 5],
  ['aerial shots', 10],
  /* Two that find nothing — the screen gives those their own card, and an empty
     one says less about the feature than a populated one. */
  ['anaar', 0],
  ['diwali lamp', 0],
];

/* -------------------------------------------------------------------------- */
/* Pass one — fill a running API                                               */
/* -------------------------------------------------------------------------- */

const uuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(rand() * 16);
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

/**
 * Fill a basket up to roughly `target` rupees.
 *
 * The catalogue runs from ₹10 kuruvi to ₹9,000 gift boxes, so picking at
 * random and stopping once the target is passed lands a ₹400 basket on
 * ₹38,000. Each pick is drawn from what still fits the gap, and the quantity
 * from what the gap affords — the basket then sits near the figure it was
 * asked for, which is what makes the order list look like a shop's.
 */
function basket(pool, target) {
  const lines = [];
  let subtotal = 0;
  let guard = 0;

  while (subtotal < target && guard++ < 14) {
    const gap = target - subtotal;
    const affordable = pool.filter((p) => p.price <= Math.max(gap, 100));
    const product = pick(affordable.length > 0 ? affordable : pool);

    if (lines.some((l) => l.id === product.id)) continue;

    const fits = Math.max(1, Math.floor(gap / Math.max(product.price, 1)));
    const qty = between(1, Math.max(1, Math.min(4, fits, product.stock)));

    lines.push({ id: product.id, qty, slug: product.slug, name: product.name, price: product.price });
    subtotal += product.price * qty;
  }

  return { items: lines.map(({ id, qty }) => ({ id, qty })), subtotal, products: lines };
}

async function seedLive() {
  console.log(`→ ${API}`);

  const boot = await get('/api/bootstrap');
  const pool = (boot.products ?? []).filter(
    (p) => p.stock > 0 && (p.availability ?? 'available') === 'available',
  );

  if (pool.length === 0) throw new Error('The catalogue came back with nothing in stock to sell.');
  console.log(`  ${pool.length} sellable products in the catalogue`);

  /* The API refuses a district it does not deliver to and a payment method it
     does not offer, both from configuration. Read them rather than assume them,
     so a shop that edits either does not turn this script into a wall of 400s. */
  const served = new Set(await get('/api/meta/districts'));
  const payments = (await get('/api/meta/payment-methods')).map((p) => p.id);
  const cardish = payments.filter((p) => p !== 'cod');

  /* ---- Orders, and the browsing that led to each one ---------------------- */

  for (const [i, journey] of JOURNEYS.entries()) {
    const customer = CUSTOMERS[i % CUSTOMERS.length];
    const session = uuid();
    const pickup = i % 4 === 3;

    if (!pickup && !served.has(customer.district)) {
      console.log(`  skipped ${customer.name} — ${customer.district} is not a delivery district`);
      continue;
    }

    /* Aim high enough that some baskets clear a coupon floor and some do not,
       so the order list is not twelve rows of the same shape. */
    const target = [400, 900, 1600, 2600, 3400][i % 5];
    const { items, subtotal, products } = basket(pool, target);

    const coupon =
      subtotal >= 1899 ? 'COMBO500' : subtotal >= 1500 ? 'EARLYBIRD' : subtotal >= 999 ? 'SILENT15' : null;

    /* The visit, in the order a real one happens. The API records
       `order_placed` itself when the order lands, so it is absent here. */
    const events = [{ type: 'page_view', ref: '/', session }];
    for (const p of products) {
      events.push({ type: 'product_view', ref: p.slug ?? p.id, label: p.name, value: p.price, session });
      events.push({ type: 'cart_add', ref: p.slug ?? p.id, label: p.name, value: p.qty, session });
    }
    events.push({ type: 'checkout_start', value: subtotal, session });
    await post('/api/analytics/events', { events });

    const order = await post('/api/orders', {
      name: customer.name,
      phone: phone(),
      email: `${customer.name.split(' ')[0].toLowerCase()}@example.com`,
      fulfilment: pickup ? 'pickup' : 'delivery',
      address: pickup ? null : address(customer),
      city: pickup ? null : customer.city,
      district: pickup ? null : customer.district,
      pincode: pickup ? null : customer.pincode,
      /* Cash on delivery is capped at ₹5,000, judged on what the basket
         actually came to rather than what it was aiming at — delivery can add
         ₹249 on top. A demo that 400s half way through is not a demo. */
      payment: subtotal <= 4500 && payments.includes('cod') ? 'cod' : pick(cardish),
      notes: i % 5 === 0 ? 'Please call before the lorry arrives.' : null,
      items,
      coupon,
      session,
    });

    /* Walk it up to its resting status, so the history reads like a life rather
       than a jump. `cancelled` is a departure, not a step on the ladder. */
    const ladder = ['pending', 'confirmed', 'processing', 'ready', 'completed'];
    const steps =
      journey.status === 'cancelled'
        ? ['confirmed', 'cancelled']
        : ladder.slice(1, ladder.indexOf(journey.status) + 1);

    for (const step of steps) {
      const last = step === journey.status;
      await patch(
        `/api/admin/orders/${order.orderId}/status`,
        { status: step, note: last ? (journey.note ?? null) : null },
        admin,
      );
    }

    console.log(`  order ${order.orderId}  ${String(journey.status).padEnd(10)} ₹${order.totals.total}`);
  }

  /* ---- Visits that browsed and did not buy ------------------------------- */

  /* Without these the funnel is four equal bars, which is not what a funnel is
     for. Each of these drops out one stage earlier than the last. */
  for (let i = 0; i < 22; i++) {
    const session = uuid();
    const product = pick(pool);
    const events = [
      { type: 'page_view', ref: '/', session },
      {
        type: 'product_view',
        ref: product.slug ?? product.id,
        label: product.name,
        value: product.price,
        session,
      },
    ];
    if (i % 2 === 0) {
      events.push({ type: 'cart_add', ref: product.slug ?? product.id, label: product.name, value: 1, session });
    }
    if (i % 5 === 0) events.push({ type: 'checkout_start', value: product.price, session });
    if (i % 7 === 0) {
      events.push({ type: 'cart_remove', ref: product.slug ?? product.id, label: product.name, session });
    }
    if (i % 4 === 0) events.push({ type: 'whatsapp_click', ref: 'product', session });

    const [query, hits] = SEARCHES[i % SEARCHES.length];
    events.push({ type: 'search', ref: query, value: hits, session });

    await post('/api/analytics/events', { events });
  }
  console.log('  22 visits that looked but did not buy');

  await seedEnquiriesAndMessages(served);

  console.log('\nSeeded.');
  console.log(
    '\nAnalytics are batched behind a 15-second timer, so stop the API with Ctrl+C\n' +
      '— which flushes on the way out — rather than killing it. Then:\n' +
      '  node demo/seed.mjs --backdate --data <storefront>/src/data',
  );
}

/**
 * Enquiries and contact messages, which the API keeps in memory and never
 * journals — orders survive a restart, these do not. Run this on its own after
 * restarting the API to put them back, without adding twelve more orders:
 *
 *   node demo/seed.mjs --enquiries
 */
async function seedEnquiriesAndMessages(districts) {
  const served = districts ?? new Set(await get('/api/meta/districts'));

  for (const e of ENQUIRIES) {
    const created = await post('/api/bulk-enquiries', {
      name: e.name,
      organisation: e.organisation,
      phone: phone(),
      email: `${e.name.split(' ')[0].toLowerCase()}@example.com`,
      /* Same district rule as an order. A bulk enquiry from outside the
         delivery map is a real thing to receive, so it falls back rather than
         being dropped. */
      district: served.has(e.district) ? e.district : 'Other (outside Tamil Nadu)',
      budget: e.budget,
      quantity: e.quantity,
      message: e.message,
      session: uuid(),
    });

    if (e.status !== 'received') {
      await patch(`/api/admin/enquiries/${created.enquiryId}/status`, { status: e.status }, admin);
    }
    console.log(`  enquiry ${created.enquiryId}  ${e.status}`);
  }

  /* ---- Contact messages -------------------------------------------------- */

  for (const m of MESSAGES) {
    await post('/api/contact-messages', {
      name: m.name,
      phone: phone(),
      email: `${m.name.split(' ')[0].toLowerCase()}@example.com`,
      subject: m.subject,
      message: m.message,
    });
  }
  console.log(`  ${MESSAGES.length} contact messages`);
}

/* -------------------------------------------------------------------------- */
/* Pass two — spread today's timestamps across the fortnight                   */
/* -------------------------------------------------------------------------- */

async function backdate() {
  const dir = flag('data');
  if (!dir) {
    throw new Error(
      'Say where the journals are: --data <storefront>/src/data\n' +
        '(the folder holding orders.json and analytics.json — the API writes them there)',
    );
  }

  const ordersPath = path.join(dir, 'orders.json');
  const analyticsPath = path.join(dir, 'analytics.json');

  if (!existsSync(ordersPath)) throw new Error(`No orders.json in ${dir}`);

  const orders = JSON.parse(await readFile(ordersPath, 'utf8'));
  const analytics = existsSync(analyticsPath) ? JSON.parse(await readFile(analyticsPath, 'utf8')) : [];

  /* Oldest first, so the order book reads chronologically once rewritten. */
  const chronological = [...orders].sort((a, b) => a.placedAt.localeCompare(b.placedAt));

  const now = Date.now();
  const dayMs = 86_400_000;
  const moved = new Map(); // orderId → new placedAt, in ms

  chronological.forEach((order, i) => {
    /* Spread them over the window, oldest first, each landing in shop hours. */
    const daysAgo = DAYS - 1 - Math.floor((i / chronological.length) * (DAYS - 1));
    const at = new Date(now - daysAgo * dayMs);
    at.setHours(between(9, 20), between(0, 59), between(0, 59), 0);

    const placedAt = Math.min(at.getTime(), now - 60_000);
    moved.set(order.orderId, placedAt);
    order.placedAt = new Date(placedAt).toISOString();

    /* The history walks forward from the order, and never past now. */
    if (Array.isArray(order.history)) {
      let cursor = placedAt;
      order.history.forEach((event, step) => {
        if (step > 0) cursor = Math.min(cursor + between(2, 26) * 3_600_000, now - 30_000);
        event.at = new Date(cursor).toISOString();
      });
    }

    /* The delivery window follows the order rather than the seeding run. */
    order.deliveryFrom = new Date(placedAt + dayMs).toISOString().slice(0, 10);
    order.deliveryTo = new Date(placedAt + 3 * dayMs).toISOString().slice(0, 10);
  });

  /* Analytics: a session moves as a unit, anchored to its order where it has
     one, so a visit never appears to happen after the order it produced. */
  const bySession = new Map();
  for (const event of analytics) {
    const key = event.session ?? '(none)';
    if (!bySession.has(key)) bySession.set(key, []);
    bySession.get(key).push(event);
  }

  let orphanDay = 0;
  for (const [, events] of bySession) {
    events.sort((a, b) => a.at.localeCompare(b.at));

    const order = events.find((e) => e.type === 'order_placed' && moved.has(e.ref));
    let start;

    if (order) {
      /* The browsing ran in the ten minutes before the order landed. */
      start = moved.get(order.ref) - 10 * 60_000;
    } else {
      const daysAgo = orphanDay++ % DAYS;
      const at = new Date(now - daysAgo * dayMs);
      at.setHours(between(8, 22), between(0, 59), between(0, 59), 0);
      start = Math.min(at.getTime(), now - 120_000);
    }

    let cursor = start;
    for (const event of events) {
      if (event.type === 'order_placed' && moved.has(event.ref)) {
        const at = moved.get(event.ref);
        event.at = new Date(at).toISOString();
        cursor = at;
        continue;
      }
      event.at = new Date(cursor).toISOString();
      cursor = Math.min(cursor + between(15, 150) * 1000, now - 1000);
    }
  }

  analytics.sort((a, b) => a.at.localeCompare(b.at));

  await writeFile(ordersPath, JSON.stringify(orders, null, 2), 'utf8');
  await writeFile(analyticsPath, JSON.stringify(analytics, null, 2), 'utf8');

  console.log(`Backdated ${orders.length} orders and ${analytics.length} events across ${DAYS} days.`);
  console.log('Start the API again and the admin has a fortnight of trade.');
}

/* -------------------------------------------------------------------------- */

try {
  if (has('backdate')) await backdate();
  else if (has('enquiries')) await seedEnquiriesAndMessages();
  else await seedLive();
} catch (error) {
  console.error(`\n${error.message}`);
  if (!has('backdate')) {
    console.error(
      '\nIs the API running, and is the passcode right?\n' +
        `  API:      ${API}\n` +
        '  Passcode: --passcode <code>, or ADMIN_PASSCODE in the environment',
    );
  }
  process.exit(1);
}
