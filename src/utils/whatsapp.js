import { formatPrice } from './format';

/**
 * The WhatsApp side of an order.
 *
 * The storefront's checkout opens WhatsApp on the customer's phone with the
 * order written out for the shop's number. That chat never reaches the API —
 * WhatsApp does not let a website read it — so this rebuilds the same message
 * from the saved order, for matching a chat to its order and for copying into
 * a reply. It mirrors `orderMessage` in the storefront's `src/utils/whatsapp.js`
 * without the greeting line, which names the shop and adds nothing here.
 */

/** `98420 11994` → `919842011994`. A bare 10-digit number is taken as Indian. */
const whatsappDigits = (phone) => {
  const digits = (phone ?? '').replace(/\D/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
};

/** A `wa.me` link to the customer, with the message pre-filled. */
export const customerWhatsappHref = (phone, message) => {
  const base = `https://wa.me/${whatsappDigits(phone)}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
};

/** The order as the customer's WhatsApp message laid it out. */
export const orderWhatsappMessage = (order) =>
  [
    `Reference: ${order.orderId}`,
    `Name: ${order.name}`,
    order.phone ? `Phone: ${order.phone}` : null,
    '',
    '*Items*',
    ...order.items.map((line, index) => {
      const lineTotal = line.lineTotal ?? line.price * line.qty;
      const unitPrice = line.price ?? lineTotal / line.qty;
      return (
        `${index + 1}. ${line.name}${line.unit ? ` (${line.unit})` : ''}\n` +
        `    ${line.qty} × ${formatPrice(unitPrice)} = ${formatPrice(lineTotal)}`
      );
    }),
    '',
    `Subtotal: ${formatPrice(order.totals.subtotal)}`,
    order.totals.couponDiscount > 0 ? `Coupon: −${formatPrice(order.totals.couponDiscount)}` : null,
    order.totals.shipping > 0 ? `Delivery: ${formatPrice(order.totals.shipping)}` : null,
    `*Total: ${formatPrice(order.totals.total)}*`,
    '',
    order.fulfilment === 'pickup'
      ? 'Collecting from the shop.'
      : `Delivering to: ${order.address}, ${order.city} ${order.pincode}`,
  ]
    .filter((part) => part !== null)
    .join('\n');

/** The shop's reply, opened in the customer's chat. */
export const orderReplyMessage = (order) =>
  `Hello ${order.name.split(' ')[0]}, thank you for your order ${order.orderId} ` +
  `(${formatPrice(order.totals.total)}). We have received it and will confirm shortly.`;
