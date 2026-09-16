/**
 * Formatting.
 *
 * A deliberate subset of the storefront's `utils/format.js` — the admin needs
 * money, dates and availability, and has no use for countdown splitting or
 * delivery-window arithmetic. Copied rather than imported: this is a separate
 * application, and a shared module would be a build-time coupling between two
 * things that are supposed to meet only at the API.
 */

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/** ₹2,499 */
export const formatPrice = (value) => inr.format(Math.round(value || 0));

export const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(value || 0);

/** 12.4% — funnel rates, which the API already rounds to one place. */
export const formatPercent = (value) => `${(value ?? 0).toFixed(1)}%`;

export const formatDate = (iso) =>
  new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  );

export const formatDay = (iso) =>
  new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(iso));

/** Percentage saved between an MRP and the selling price. */
export const discountPercent = (mrp, price) => {
  if (!mrp || mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
};

/**
 * The three availability states, derived exactly as the API derives them.
 *
 * The API is the authority and sends `availability` on every product; this is
 * here so a row the admin has just edited in memory, before the reload lands,
 * still shows the right badge.
 */
export const availabilityOf = (item) => {
  if (!item) return { key: 'out', state: 'out-of-stock', label: 'Unavailable' };
  if (item.active === false) {
    return { key: 'unavailable', state: 'unavailable', label: 'Deactivated' };
  }

  const stock = item.stock ?? 0;
  if (stock <= 0) return { key: 'out', state: 'out-of-stock', label: 'Out of stock' };
  if (stock <= 20) return { key: 'low', state: 'available', label: `${stock} left` };
  return { key: 'high', state: 'available', label: 'In stock' };
};
