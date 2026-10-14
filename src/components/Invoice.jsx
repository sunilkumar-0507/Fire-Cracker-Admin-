import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { adminApi } from '@/lib/api';
import { formatPrice } from '@/utils/format';
import { paymentLabel } from '@/constants';
import { Button } from '@/ui';
import { Printer, X } from '@/components/icons';

/**
 * The invoice for one order — online or raised at the counter.
 *
 * Rendered from the saved order and nothing else, so a reprint next week says
 * exactly what the first print said. There is no PDF library: the browser's
 * print dialog already offers "Save as PDF", and a print stylesheet costs
 * nothing to ship.
 */

/** What the letterhead says when `/meta/brand` cannot be reached. */
const FALLBACK_BRAND = {
  name: 'SKV Pyros',
  tagline: 'Sivakasi · Since 1994',
  phone: '',
  email: '',
  address: 'Sivakasi, Virudhunagar District, Tamil Nadu',
  gstin: '',
  licence: '',
};

let brandCache = null;

const useBrand = () => {
  const [brand, setBrand] = useState(brandCache ?? FALLBACK_BRAND);

  useEffect(() => {
    if (brandCache) return undefined;
    const controller = new AbortController();
    adminApi
      .brand(controller.signal)
      .then((b) => {
        if (!b) return;
        brandCache = { ...FALLBACK_BRAND, ...b };
        setBrand(brandCache);
      })
      .catch(() => {
        // The fallback is already on the page; an invoice without a GSTIN line
        // is still an invoice.
      });
    return () => controller.abort();
  }, []);

  return brand;
};

/* -------------------------------------------------------------------------- */
/* Amount in words                                                             */
/* -------------------------------------------------------------------------- */

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const belowHundred = (n) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]} ${ONES[n % 10]}`.trim());

const belowThousand = (n) => {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  return [hundreds ? `${ONES[hundreds]} Hundred` : '', rest ? belowHundred(rest) : '']
    .filter(Boolean)
    .join(' ');
};

/** 125499 → "One Lakh Twenty Five Thousand Four Hundred Ninety Nine" — Indian grouping. */
const amountInWords = (value) => {
  let n = Math.round(Math.abs(value || 0));
  if (n === 0) return 'Zero';

  const parts = [];
  for (const [size, name] of [[10_000_000, 'Crore'], [100_000, 'Lakh'], [1000, 'Thousand']]) {
    if (n >= size) {
      const count = Math.floor(n / size);
      parts.push(`${count >= 1000 ? amountInWords(count) : belowThousand(count)} ${name}`);
      n %= size;
    }
  }
  if (n) parts.push(belowThousand(n));
  return parts.join(' ');
};

/* -------------------------------------------------------------------------- */
/* The sheet                                                                   */
/* -------------------------------------------------------------------------- */

const formatInvoiceDate = (iso) =>
  new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));

const PAYMENT_STATE = {
  paid: 'Paid',
  pending: 'Payment due',
  processing: 'Payment in progress',
  failed: 'Payment failed',
  refunded: 'Refunded',
};

export const InvoiceSheet = ({ order }) => {
  const brand = useBrand();
  const { totals } = order;
  const offline = order.channel === 'offline' || order.orderId.startsWith('INV');
  const addressLines = [
    order.address,
    [order.city, order.district].filter(Boolean).join(', ') + (order.pincode ? ` — ${order.pincode}` : ''),
  ].filter((line) => line && line.trim() && line.trim() !== '—');
  // An online pickup order records the shop's own counter as its address,
  // which is not where the customer lives — leave it off the bill-to block.
  const showAddress = order.fulfilment !== 'pickup' || offline;

  return (
    <article className="mx-auto w-full max-w-[800px] bg-white p-8 text-[13px] leading-relaxed text-slate-800 print:max-w-none print:p-0">
      <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-slate-900 pb-5">
        <div className="min-w-0">
          <p className="text-2xl font-bold text-slate-900">{brand.name}</p>
          {brand.tagline ? <p className="text-xs text-slate-500">{brand.tagline}</p> : null}
          <p className="mt-2 max-w-xs text-xs text-slate-600">{brand.address}</p>
          <p className="text-xs text-slate-600">
            {[brand.phone, brand.email].filter(Boolean).join(' · ')}
          </p>
          {brand.gstin ? <p className="text-xs text-slate-600">GSTIN: {brand.gstin}</p> : null}
          {brand.licence ? <p className="text-xs text-slate-600">{brand.licence}</p> : null}
        </div>
        <div className="text-right">
          <p className="text-xl font-semibold uppercase tracking-[.2em] text-slate-900">Invoice</p>
          <dl className="mt-2 space-y-0.5 text-xs">
            <div>
              <dt className="inline text-slate-500">Invoice no. </dt>
              <dd className="inline font-mono font-semibold text-slate-900">{order.orderId}</dd>
            </div>
            <div>
              <dt className="inline text-slate-500">Date </dt>
              <dd className="inline font-medium">{formatInvoiceDate(order.placedAt)}</dd>
            </div>
            <div>
              <dt className="inline text-slate-500">Sale </dt>
              <dd className="inline font-medium">{offline ? 'At the shop' : 'Online order'}</dd>
            </div>
          </dl>
        </div>
      </header>

      <section className="grid gap-6 border-b border-slate-200 py-5 sm:grid-cols-2 print:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Bill to</p>
          <p className="mt-1 font-semibold text-slate-900">{order.name}</p>
          {order.phone ? <p>{order.phone}</p> : null}
          {order.email ? <p>{order.email}</p> : null}
          {showAddress ? addressLines.map((line) => <p key={line}>{line}</p>) : null}
        </div>
        <div className="sm:text-right print:text-right">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Payment</p>
          <p className="mt-1 font-medium">{paymentLabel(order.payment)}</p>
          <p>{PAYMENT_STATE[order.paymentStatus] ?? order.paymentStatus}</p>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {order.fulfilment === 'pickup' ? 'Handed over at' : 'Delivery'}
          </p>
          <p>{order.fulfilment === 'pickup' ? 'The shop counter' : 'To the address shown'}</p>
        </div>
      </section>

      <table className="mt-5 w-full border-collapse text-[12px]">
        <thead>
          <tr className="border-b border-slate-300 text-left text-[11px] uppercase tracking-wide text-slate-500">
            <th className="py-2 pr-2 font-semibold">#</th>
            <th className="py-2 pr-2 font-semibold">Item</th>
            <th className="py-2 pr-2 text-right font-semibold">MRP</th>
            <th className="py-2 pr-2 text-right font-semibold">Rate</th>
            <th className="py-2 pr-2 text-right font-semibold">Qty</th>
            <th className="py-2 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((line, index) => (
            <tr key={line.id} className="border-b border-slate-100 align-top">
              <td className="py-2 pr-2 text-slate-500">{index + 1}</td>
              <td className="py-2 pr-2">
                <span className="block font-medium text-slate-900">{line.name}</span>
                {line.unit ? <span className="block text-[11px] text-slate-500">{line.unit}</span> : null}
              </td>
              <td className="py-2 pr-2 text-right text-slate-500">
                {line.mrp > line.price ? <s>{formatPrice(line.mrp)}</s> : formatPrice(line.mrp || line.price)}
              </td>
              <td className="py-2 pr-2 text-right">{formatPrice(line.price)}</td>
              <td className="py-2 pr-2 text-right">{line.qty}</td>
              <td className="py-2 text-right font-semibold text-slate-900">
                {formatPrice(line.lineTotal ?? line.price * line.qty)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="mt-5 flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0 max-w-sm flex-1 text-xs text-slate-600">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Amount in words</p>
          <p className="mt-1 font-medium text-slate-800">Rupees {amountInWords(totals.total)} Only</p>
          {order.notes ? (
            <>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Notes</p>
              <p className="mt-1 whitespace-pre-wrap">{order.notes}</p>
            </>
          ) : null}
        </div>

        <dl className="w-full max-w-[280px] space-y-1 text-[13px]">
          {totals.catalogueSavings > 0 ? (
            <>
              <div className="flex justify-between gap-4 text-slate-500">
                <dt>MRP total</dt>
                <dd>{formatPrice(totals.mrpTotal)}</dd>
              </div>
              <div className="flex justify-between gap-4 text-slate-500">
                <dt>Discount on MRP</dt>
                <dd>−{formatPrice(totals.catalogueSavings)}</dd>
              </div>
            </>
          ) : null}
          <div className="flex justify-between gap-4">
            <dt>Subtotal</dt>
            <dd>{formatPrice(totals.subtotal)}</dd>
          </div>
          {totals.couponDiscount > 0 || order.coupon ? (
            <div className="flex justify-between gap-4">
              <dt>Coupon{order.coupon ? ` (${order.coupon.code})` : ''}</dt>
              <dd>−{formatPrice(totals.couponDiscount)}</dd>
            </div>
          ) : null}
          {totals.shipping > 0 ? (
            <div className="flex justify-between gap-4">
              <dt>Delivery</dt>
              <dd>{formatPrice(totals.shipping)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4 border-t-2 border-slate-900 pt-2 text-base font-bold text-slate-900">
            <dt>Total</dt>
            <dd>{formatPrice(totals.total)}</dd>
          </div>
          {totals.totalSavings > 0 ? (
            <p className="pt-1 text-right text-[11px] font-medium text-emerald-700">
              You saved {formatPrice(totals.totalSavings)}
            </p>
          ) : null}
        </dl>
      </section>

      <footer className="mt-10 flex flex-wrap items-end justify-between gap-6 border-t border-slate-200 pt-4 text-[11px] text-slate-500">
        <p>Thank you for shopping with {brand.name}. Please handle fireworks with care.</p>
        <p className="text-right">
          <span className="block h-8" />
          Authorised signatory
        </p>
      </footer>
    </article>
  );
};

/**
 * The invoice over the page, with a print button.
 *
 * Portalled to <body> and tagged `invoice-print`, which the print stylesheet in
 * styles.css keeps while hiding everything else — so printing gives one clean
 * sheet rather than the admin with an invoice floating on it.
 */
export const InvoiceModal = ({ order, onClose }) => {
  useEffect(() => {
    if (!order) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [order, onClose]);

  if (!order) return null;

  return createPortal(
    <div
      className="invoice-print fixed inset-0 z-[60] overflow-y-auto bg-slate-900/60 p-4 print:static print:overflow-visible print:bg-white print:p-0"
      role="dialog"
      aria-modal="true"
      aria-label={`Invoice ${order.orderId}`}
    >
      <div className="mx-auto mb-3 flex max-w-[800px] items-center justify-end gap-2 print:hidden">
        <Button variant="accent" size="sm" icon={<Printer size={13} />} onClick={() => window.print()}>
          Print / Save PDF
        </Button>
        <Button variant="outline" size="sm" icon={<X size={12} />} onClick={onClose}>
          Close
        </Button>
      </div>
      <div className="rounded-xl shadow-2xl print:rounded-none print:shadow-none">
        <InvoiceSheet order={order} />
      </div>
    </div>,
    document.body,
  );
};

export default InvoiceModal;
