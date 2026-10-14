import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';
import { combos, offers, products } from '@/lib/catalog';
import { formatDate, formatPrice } from '@/utils/format';
import {
  Badge,
  Button,
  Card,
  Drawer,
  EmptyState,
  Field,
  Input,
  Loading,
  Select,
  Table,
  Td,
  Textarea,
  Toggle,
} from '@/ui';
import { Minus, Plus, Printer, Search, Trash2 } from '@/components/icons';
import { InvoiceModal } from '@/components/Invoice';
import {
  INVOICE_PAYMENTS,
  PAYMENT_LABEL,
  STATUS_LABEL,
  STATUS_TONE,
  paymentLabel,
} from '@/constants';
import { useOrderStatuses } from '@/lib/statuses';

/** Everything that can go on an invoice: live products, then combo packs. */
const sellable = () => [
  ...products
    .filter((p) => p.active !== false)
    .map((p) => ({ id: p.id, name: p.name, unit: p.unit, code: p.code, price: p.price, mrp: p.mrp, stock: p.stock ?? 0, kind: 'product' })),
  ...combos.map((c) => ({
    id: c.id,
    name: c.name,
    unit: `${c.itemCount ?? ''} items`.trim(),
    code: '',
    price: c.price,
    mrp: c.mrp,
    stock: c.stock ?? 0,
    kind: 'combo',
  })),
];

const EMPTY_FORM = {
  name: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  district: '',
  pincode: '',
  fulfilment: 'pickup',
  payment: 'cash',
  paid: true,
  status: 'completed',
  coupon: '',
  notes: '',
};

/* -------------------------------------------------------------------------- */
/* Item picker                                                                 */
/* -------------------------------------------------------------------------- */

const ItemPicker = ({ onPick }) => {
  const [term, setTerm] = useState('');
  const catalogue = useMemo(() => sellable(), []);

  const matches = useMemo(() => {
    const t = term.trim().toLowerCase();
    if (!t) return [];
    return catalogue
      .filter((item) => item.name.toLowerCase().includes(t) || (item.code ?? '').toLowerCase().includes(t))
      .slice(0, 8);
  }, [term, catalogue]);

  return (
    <div className="relative">
      <Search size={13} className="absolute left-3 top-[19px] -translate-y-1/2 text-slate-400" />
      <Input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Search a product or combo to add"
        className="pl-8"
      />
      {matches.length ? (
        <ul className="absolute inset-x-0 top-full z-10 mt-1 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {matches.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                disabled={item.stock <= 0}
                onClick={() => {
                  onPick(item);
                  setTerm('');
                }}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-slate-800">{item.name}</span>
                  <span className="block text-xs text-slate-500">
                    {item.kind === 'combo' ? 'Combo · ' : ''}
                    {item.unit} · {item.stock > 0 ? `${item.stock} in stock` : 'Out of stock'}
                  </span>
                </span>
                <span className="shrink-0 font-semibold text-slate-900">{formatPrice(item.price)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* New invoice                                                                 */
/* -------------------------------------------------------------------------- */

/** Mounted only while open, so every new invoice starts from a blank form. */
const NewInvoice = ({ onClose, onSaved }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [lines, setLines] = useState([]);
  const [priced, setQuote] = useState(null);
  const [pricingError, setQuoteError] = useState('');
  // A quote or an error from before the last line was removed says nothing
  // about an empty invoice.
  const quote = lines.length ? priced : null;
  const quoteError = lines.length ? pricingError : '';
  const [saving, setSaving] = useState(false);
  const statuses = useOrderStatuses();

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // The running total is the API's own quote, so the coupon, the delivery fee
  // and the rounding on screen are the ones the saved invoice will carry.
  useEffect(() => {
    if (!lines.length) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      adminApi
        .quote(
          {
            items: lines.map((l) => ({ id: l.id, qty: l.qty })),
            coupon: form.coupon.trim() || undefined,
            fulfilment: form.fulfilment,
          },
          controller.signal,
        )
        .then((q) => {
          setQuote(q);
          setQuoteError('');
        })
        .catch((err) => {
          if (err.name === 'AbortError') return;
          setQuote(null);
          setQuoteError(err.message);
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [lines, form.coupon, form.fulfilment]);

  const add = (item) =>
    setLines((prev) =>
      prev.some((l) => l.id === item.id)
        ? prev.map((l) => (l.id === item.id ? { ...l, qty: Math.min(l.qty + 1, l.stock) } : l))
        : [...prev, { ...item, qty: 1 }],
    );

  const setQty = (id, qty) =>
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, qty: Math.max(1, Math.min(Number(qty) || 1, l.stock, 999)) } : l)),
    );

  const couponNotice = useMemo(() => {
    if (!form.coupon.trim() || !quote) return null;
    if (quote.coupon) return { ok: true, text: `${quote.coupon.code} applied — ${quote.coupon.note}` };
    // The quote reports why a code did not apply among its notices; the
    // pickup sentence is the other notice it can carry.
    const reason = quote.notices?.find((n) => !n.startsWith('Collecting') && !n.startsWith('Only'));
    return { ok: false, text: reason ?? 'This code does not apply' };
  }, [form.coupon, quote]);

  const save = async () => {
    if (form.name.trim().length < 2) return toast.error('Add the customer’s name');
    if (!lines.length) return toast.error('Add at least one item');

    setSaving(true);
    try {
      const order = await adminApi.orders.create({
        ...form,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        district: form.district.trim() || undefined,
        pincode: form.pincode.trim() || undefined,
        coupon: form.coupon.trim() || undefined,
        notes: form.notes.trim() || undefined,
        items: lines.map((l) => ({ id: l.id, qty: l.qty })),
      });
      toast.success(`Invoice ${order.orderId} saved`);
      onSaved(order);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const totals = quote?.totals;

  return (
    <Drawer
      open
      onClose={onClose}
      wide
      title="New invoice"
      subtitle="For a customer buying at the shop or over the phone. It is saved as an order."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="accent" busy={saving} icon={<Printer size={13} />} onClick={save}>
            Save and view invoice
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Card title="Customer" bodyClass="grid gap-3 p-4 sm:grid-cols-2">
          <Field label="Name" required>
            <Input value={form.name} onChange={set('name')} maxLength={120} autoFocus />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={set('phone')} inputMode="tel" maxLength={20} />
          </Field>
          <Field label="Email" className="sm:col-span-2">
            <Input value={form.email} onChange={set('email')} type="email" />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <Input value={form.address} onChange={set('address')} maxLength={400} />
          </Field>
          <Field label="City">
            <Input value={form.city} onChange={set('city')} maxLength={120} />
          </Field>
          <Field label="District">
            <Input value={form.district} onChange={set('district')} maxLength={120} />
          </Field>
          <Field label="Pincode">
            <Input value={form.pincode} onChange={set('pincode')} inputMode="numeric" maxLength={6} />
          </Field>
        </Card>

        <Card title="Items" bodyClass="space-y-3 p-4">
          <ItemPicker onPick={add} />

          {lines.length ? (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
              {lines.map((line) => {
                const priced = quote?.items?.find((q) => q.id === line.id);
                return (
                  <li key={line.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{line.name}</p>
                      <p className="text-xs text-slate-500">
                        {formatPrice(line.price)} · {line.stock} in stock
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        aria-label="One fewer"
                        icon={<Minus size={11} />}
                        onClick={() => setQty(line.id, line.qty - 1)}
                      />
                      <Input
                        value={line.qty}
                        onChange={(e) => setQty(line.id, e.target.value)}
                        inputMode="numeric"
                        className="h-8 w-16 text-center"
                        aria-label={`Quantity of ${line.name}`}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        aria-label="One more"
                        icon={<Plus size={11} />}
                        onClick={() => setQty(line.id, line.qty + 1)}
                      />
                    </div>
                    <span className="w-20 text-right text-sm font-semibold text-slate-900">
                      {formatPrice(priced?.lineTotal ?? line.price * line.qty)}
                    </span>
                    <Button
                      size="sm"
                      variant="danger"
                      aria-label={`Remove ${line.name}`}
                      icon={<Trash2 size={12} />}
                      onClick={() => setLines((prev) => prev.filter((l) => l.id !== line.id))}
                    />
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">
              Prices come from the catalogue. Adding an item takes it off the shelf when the invoice is saved.
            </p>
          )}
        </Card>

        <Card title="Payment and coupon" bodyClass="grid gap-3 p-4 sm:grid-cols-2">
          <Field label="Coupon code" hint="Only codes created under Coupons">
            <Input
              value={form.coupon}
              onChange={(e) => setForm((f) => ({ ...f, coupon: e.target.value.toUpperCase() }))}
              list="invoice-coupons"
              placeholder="e.g. EARLYBIRD"
            />
            <datalist id="invoice-coupons">
              {offers
                .filter((o) => o.code)
                .map((o) => (
                  <option key={o.id} value={o.code}>
                    {o.title}
                  </option>
                ))}
            </datalist>
            {couponNotice ? (
              <span
                className={`mt-1 block text-[11px] font-medium ${couponNotice.ok ? 'text-emerald-700' : 'text-rose-600'}`}
              >
                {couponNotice.text}
              </span>
            ) : null}
          </Field>
          <Field label="Handed over">
            <Select value={form.fulfilment} onChange={set('fulfilment')}>
              <option value="pickup">At the counter (no delivery charge)</option>
              <option value="delivery">Delivered</option>
            </Select>
          </Field>
          <Field label="Paid by">
            <Select value={form.payment} onChange={set('payment')}>
              {INVOICE_PAYMENTS.map((p) => (
                <option key={p} value={p}>
                  {PAYMENT_LABEL[p]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Order status">
            <Select value={form.status} onChange={set('status')}>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s] ?? s}
                </option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Toggle
              checked={form.paid}
              onChange={(paid) => setForm((f) => ({ ...f, paid }))}
              label="Payment received"
              hint="Leave off for credit or a sale to be paid later."
            />
          </div>
          <Field label="Notes" className="sm:col-span-2" hint="Printed on the invoice">
            <Textarea value={form.notes} onChange={set('notes')} rows={2} maxLength={1000} />
          </Field>
        </Card>

        <Card title="Total" bodyClass="p-4">
          {quoteError ? (
            <p className="text-sm text-rose-600">{quoteError}</p>
          ) : totals ? (
            <dl className="space-y-1.5 text-sm">
              {[
                ['Subtotal', totals.subtotal],
                [`Coupon${quote.coupon ? ` (${quote.coupon.code})` : ''}`, -totals.couponDiscount],
                ['Delivery', totals.shipping],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 text-slate-600">
                  <dt>{label}</dt>
                  <dd>{formatPrice(value)}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-4 border-t border-slate-200 pt-2 text-base font-semibold text-slate-900">
                <dt>Total</dt>
                <dd>{formatPrice(totals.total)}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-slate-500">Add an item to see the total.</p>
          )}
        </Card>
      </div>
    </Drawer>
  );
};

/* -------------------------------------------------------------------------- */
/* The screen                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Invoices for every order — the checkout's and the counter's.
 *
 * An invoice raised here is an order like any other: it shows in the order
 * book under an `INV` id, takes stock, and can be moved through statuses
 * there. This screen is where they are raised and where any order's invoice is
 * printed.
 */
export const Invoices = () => {
  const { reload } = useOutletContext() ?? {};
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [channel, setChannel] = useState('all');
  const [query, setQuery] = useState('');
  const [viewing, setViewing] = useState(null);
  const creating = searchParams.get('new') === '1';

  const setCreating = (value) =>
    setSearchParams(value ? { new: '1' } : {}, { replace: true });

  const load = useCallback(async () => {
    try {
      const page = await adminApi.orders.list({ channel, q: query, pageSize: 100 });
      setRows(page.items);
      setError('');
    } catch (err) {
      setError(err.message);
      setRows([]);
    }
  }, [channel, query]);

  useEffect(() => {
    const timer = setTimeout(load, query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, query]);

  const saved = (order) => {
    setCreating(false);
    setRows((prev) => (channel === 'online' ? prev : [order, ...(prev ?? [])]));
    setViewing(order);
    // The invoice took goods off the shelf; the catalogue's stock figures are
    // now a sale behind.
    reload?.();
  };

  const closeInvoice = useCallback(() => setViewing(null), []);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-900">Invoices</h1>
          <p className="mt-1 text-sm text-slate-500">
            Print an invoice for any order, or raise one for a customer at the shop.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Invoice no., name, phone, city"
              className="w-64 pl-8"
            />
          </div>
          <Select value={channel} onChange={(e) => setChannel(e.target.value)} className="w-40">
            <option value="all">All invoices</option>
            <option value="offline">At the shop</option>
            <option value="online">Online orders</option>
          </Select>
          <Button variant="accent" icon={<Plus size={13} />} onClick={() => setCreating(true)}>
            New invoice
          </Button>
        </div>
      </header>

      <Card bodyClass="p-0">
        {rows === null ? (
          <Loading label="Loading invoices" />
        ) : error ? (
          <EmptyState title="Could not load invoices" hint={error} />
        ) : rows.length === 0 ? (
          <EmptyState
            title={query || channel !== 'all' ? 'Nothing matched' : 'No invoices yet'}
            hint="Every order placed online has an invoice here. Raise one for a counter sale with New invoice."
          />
        ) : (
          <Table
            head={[
              'Invoice no.',
              'Customer',
              'Sale',
              'Date',
              'Payment',
              'Status',
              { key: 't', label: 'Total', align: 'right' },
              { key: 'a', label: '', align: 'right' },
            ]}
          >
            {rows.map((order) => (
              <tr key={order.orderId} className="hover:bg-slate-50">
                <Td className="font-mono text-xs text-slate-900">{order.orderId}</Td>
                <Td>
                  <span className="block font-medium text-slate-800">{order.name}</span>
                  <span className="block text-xs text-slate-500">
                    {[order.phone, order.city].filter(Boolean).join(' · ') || '—'}
                  </span>
                </Td>
                <Td>
                  <Badge tone={order.channel === 'offline' ? 'indigo' : 'neutral'}>
                    {order.channel === 'offline' ? 'At the shop' : 'Online'}
                  </Badge>
                </Td>
                <Td className="whitespace-nowrap text-xs text-slate-500">{formatDate(order.placedAt)}</Td>
                <Td className="text-xs">
                  <span className="block text-slate-700">{paymentLabel(order.payment)}</span>
                  <span className={order.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-700'}>
                    {order.paymentStatus === 'paid' ? 'Paid' : 'Due'}
                  </span>
                </Td>
                <Td>
                  <Badge tone={STATUS_TONE[order.status]}>{STATUS_LABEL[order.status] ?? order.status}</Badge>
                </Td>
                <Td align="right" className="font-semibold text-slate-900">
                  {formatPrice(order.totals.total)}
                </Td>
                <Td align="right">
                  <Button size="sm" variant="outline" icon={<Printer size={12} />} onClick={() => setViewing(order)}>
                    Invoice
                  </Button>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {creating ? <NewInvoice onClose={() => setCreating(false)} onSaved={saved} /> : null}
      <InvoiceModal order={viewing} onClose={closeInvoice} />
    </div>
  );
};

export default Invoices;
