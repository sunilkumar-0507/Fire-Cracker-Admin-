/**
 * Admin vocabulary shared across screens.
 *
 * These live outside the page components so a status never reads one colour on
 * the dashboard and another in the order book, and so editing a screen does not
 * cost a full reload during development.
 */

/**
 * The order vocabulary, in the order an order moves through.
 *
 * A fallback now, not the source: `lib/statuses.js` fetches
 * `/admin/orders/statuses` and only falls back to this when the call fails, so
 * a status added on the API side reaches the screens without an admin release.
 * Keep it in step anyway — it is what renders when the API cannot be reached.
 */
export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'ready',
  'completed',
  'cancelled',
];

/**
 * What each status is called on screen.
 *
 * "Ready" means two different things depending on fulfilment — on a lorry, or
 * waiting at the counter — so the order book labels it by what the shop has
 * to do next, and the customer's tracking page words it for them.
 */
export const STATUS_LABEL = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

/** Badge tone per status: in progress reads cool, done reads green, cancelled red. */
export const STATUS_TONE = {
  pending: 'amber',
  confirmed: 'indigo',
  processing: 'indigo',
  ready: 'teal',
  completed: 'emerald',
  cancelled: 'rose',
};

/** Statuses that still need somebody to do something — the dashboard queue. */
export const OPEN_STATUSES = ['pending', 'confirmed', 'processing', 'ready'];

/** Bulk enquiry vocabulary. Fallback for `/admin/enquiries/statuses`, as above. */
export const ENQUIRY_STATUSES = ['received', 'quoted', 'won', 'closed'];

export const ENQUIRY_TONE = {
  received: 'amber',
  quoted: 'indigo',
  won: 'emerald',
  closed: 'slate',
};

/** The three availability states, mirroring `Models.Availability`. */
export const AVAILABILITY_TONE = {
  available: 'emerald',
  'out-of-stock': 'rose',
  unavailable: 'slate',
};

export const AVAILABILITY_LABEL = {
  available: 'Available',
  'out-of-stock': 'Out of stock',
  unavailable: 'Deactivated',
};

/** The eight vector art types `resolveImage` can fall back to. */
export const ART_TYPES = [
  'flowerpot',
  'sparkler',
  'chakkar',
  'rocket',
  'aerial',
  'bomb',
  'kids',
  'giftbox',
];

export const NOISE_LEVELS = ['silent', 'low', 'medium', 'high', 'mixed'];
