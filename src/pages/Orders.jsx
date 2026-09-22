import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';
import { formatDate, formatPrice } from '@/utils/format';
import { Badge, Button, Card, Drawer, EmptyState, Input, Loading, Select, Table, Td } from '@/ui';
import { Search } from '@/components/icons';
import { STATUS_LABEL, STATUS_TONE } from '@/constants';
import { useOrderStatuses } from '@/lib/statuses';


const OrderDetail = ({ order, onStatus, busy, note, onNote, statuses }) => (
  <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-2">
      {[
        ['Placed', formatDate(order.placedAt)],
        ['Fulfilment', order.fulfilment === 'pickup' ? 'Collection from the shop' : 'Delivery'],
        ['Payment', order.payment.toUpperCase()],
        ['Phone', order.phone],
        ['Email', order.email ?? '—'],
        [
          order.fulfilment === 'pickup' ? 'Ready from' : 'Delivery window',
          order.fulfilment === 'pickup'
            ? order.deliveryFrom
            : `${order.deliveryFrom} → ${order.deliveryTo}`,
        ],
        ['Coupon', order.coupon ? `${order.coupon.code} (${order.coupon.note})` : '—'],
      ].map(([label, value]) => (
        <div key={label} className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-0.5 break-words text-sm font-medium text-slate-800">{value}</p>
        </div>
      ))}
    </div>

    <Card title={order.fulfilment === 'pickup' ? 'Collecting from the counter' : 'Deliver to'} bodyClass="p-4">
      <p className="text-sm font-medium text-slate-800">{order.name}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">
        {order.address}
        <br />
        {order.city}, {order.district} — {order.pincode}
      </p>
      {order.notes ? <p className="mt-2 text-xs text-slate-500">{order.notes}</p> : null}
    </Card>

    {/* The customer sees exactly this on the tracking page, which is the
        reason it is worth showing here rather than only the current status. */}
    <Card title="History" bodyClass="p-4">
      <ol className="space-y-3">
        {[...(order.history ?? [])].reverse().map((event, index) => (
          <li key={`${event.status}-${event.at}`} className="flex gap-3">
            <span
              className={
                index === 0
                  ? 'mt-1.5 h-2 w-2 shrink-0 rounded-full bg-teal-600'
                  : 'mt-1.5 h-2 w-2 shrink-0 rounded-full bg-slate-300'
              }
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800">
                {STATUS_LABEL[event.status] ?? event.status}
              </p>
              <p className="text-[11px] text-slate-500">{formatDate(event.at)}</p>
              {event.note ? (
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{event.note}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </Card>

    <Card title={`${order.items.length} line${order.items.length === 1 ? '' : 's'}`} bodyClass="p-0">
      <Table head={['Item', { key: 'q', label: 'Qty', align: 'right' }, { key: 't', label: 'Total', align: 'right' }]}>
        {order.items.map((line) => (
          <tr key={line.id}>
            <Td>
              <span className="block font-medium text-slate-800">{line.name}</span>
              <span className="block text-xs text-slate-500">
                {line.unit} · {formatPrice(line.price)}
              </span>
            </Td>
            <Td align="right">{line.qty}</Td>
            <Td align="right" className="font-semibold text-slate-900">
              {formatPrice(line.lineTotal)}
            </Td>
          </tr>
        ))}
      </Table>
    </Card>

    <Card title="Totals" bodyClass="p-4">
      <dl className="space-y-1.5 text-sm">
        {[
          ['Subtotal', order.totals.subtotal],
          ['Coupon discount', -order.totals.couponDiscount],
          [order.fulfilment === 'pickup' ? 'Collection' : 'Delivery', order.totals.shipping],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 text-slate-600">
            <dt>{label}</dt>
            <dd>{formatPrice(value)}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-4 border-t border-slate-200 pt-2 text-base font-semibold text-slate-900">
          <dt>Total</dt>
          <dd>{formatPrice(order.totals.total)}</dd>
        </div>
      </dl>
    </Card>

    <Card title="Move this order on" bodyClass="p-4">
      <div className="flex flex-wrap gap-2">
        {statuses.map((status) => (
          <Button
            key={status}
            size="sm"
            busy={busy === status}
            disabled={status === order.status}
            variant={status === order.status ? 'accent' : 'outline'}
            onClick={() => onStatus(status)}
          >
            {STATUS_LABEL[status] ?? status}
          </Button>
        ))}
      </div>

      {/* Optional, and attached to whichever status is clicked next. A lorry
          number or a reason for cancelling is worth more to the customer than
          the bare status change, and this is the only place to put it. */}
      <div className="mt-3">
        <Input
          value={note}
          onChange={(event) => onNote(event.target.value)}
          placeholder="Optional note — shown to the customer on the tracking page"
          maxLength={200}
        />
      </div>

      <p className="mt-2 text-xs text-slate-500">
        The customer is not messaged automatically, but they can see this on the tracking page
        with their reference number.
      </p>
    </Card>
  </div>
);

/**
 * The order book. Orders are written by the storefront checkout and persisted
 * by the API, so this list survives a restart of both.
 */
export const Orders = () => {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');
  const orderStatuses = useOrderStatuses();

  const load = useCallback(async () => {
    try {
      const page = await adminApi.orders.list({ status, q: query, pageSize: 100 });
      setRows(page.items);
      setError('');
    } catch (err) {
      setError(err.message);
      setRows([]);
    }
  }, [status, query]);

  // Refetching on every keystroke would be a request per character; the search
  // is server-side, so it waits for a pause in typing instead.
  useEffect(() => {
    const timer = setTimeout(load, query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, query]);

  const changeStatus = async (next) => {
    setBusy(next);
    try {
      const updated = await adminApi.orders.setStatus(open.orderId, next, note.trim() || undefined);
      setOpen(updated);
      setRows((prev) => prev.map((o) => (o.orderId === updated.orderId ? updated : o)));
      // The note belonged to that one step; leaving it in the box would attach
      // "loaded on TN59 4471" to whatever status is clicked next.
      setNote('');
      toast.success(`${updated.orderId} is now ${STATUS_LABEL[next] ?? next}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-900">Orders</h1>
          <p className="mt-1 text-sm text-slate-500">
            Everything placed through the shop’s checkout.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Order id, name, phone, city"
              className="w-64 pl-8"
            />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-40">
            <option value="all">All statuses</option>
            {orderStatuses.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s] ?? s}
              </option>
            ))}
          </Select>
        </div>
      </header>

      <Card bodyClass="p-0">
        {rows === null ? (
          <Loading label="Loading orders" />
        ) : error ? (
          <EmptyState title="Could not load orders" hint={error} />
        ) : rows.length === 0 ? (
          <EmptyState
            title={query || status !== 'all' ? 'Nothing matched' : 'No orders yet'}
            hint={
              query || status !== 'all'
                ? 'Try a different search or status.'
                : 'Place an order through the shop’s checkout and it will appear here.'
            }
          />
        ) : (
          <Table
            head={[
              'Order',
              'Customer',
              'Fulfilment',
              'Placed',
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
                    {order.phone} · {order.city}
                  </span>
                </Td>
                <Td>
                  <Badge tone={order.fulfilment === 'pickup' ? 'amber' : 'neutral'}>
                    {order.fulfilment === 'pickup' ? 'Collect' : 'Deliver'}
                  </Badge>
                </Td>
                <Td className="whitespace-nowrap text-xs text-slate-500">
                  {formatDate(order.placedAt)}
                </Td>
                <Td>
                  <Badge tone={STATUS_TONE[order.status]}>
                    {STATUS_LABEL[order.status] ?? order.status}
                  </Badge>
                </Td>
                <Td align="right" className="font-semibold text-slate-900">
                  {formatPrice(order.totals.total)}
                </Td>
                <Td align="right">
                  <Button size="sm" variant="outline" onClick={() => setOpen(order)}>
                    Open
                  </Button>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Drawer
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        wide
        title={open ? open.orderId : ''}
        subtitle={open ? `${open.name} · ${open.phone}` : ''}
      >
        {open ? (
          <OrderDetail
            order={open}
            onStatus={changeStatus}
            busy={busy}
            note={note}
            onNote={setNote}
            statuses={orderStatuses}
          />
        ) : null}
      </Drawer>
    </div>
  );
};

export default Orders;
