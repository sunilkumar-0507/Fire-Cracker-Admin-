import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '@/lib/api';
import { formatDate, formatPrice } from '@/utils/format';
import { Badge, Card, EmptyState, Loading, Table, Td } from '@/ui';
import { STATUS_LABEL, STATUS_TONE } from '@/constants';

const Stat = ({ label, value, hint, tone = 'slate' }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <p
      className={
        tone === 'rose'
          ? 'mt-1 font-display text-2xl font-semibold text-rose-600'
          : 'mt-1 font-display text-2xl font-semibold text-slate-900'
      }
    >
      {value}
    </p>
    {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
  </div>
);

/**
 * The landing screen. Everything here comes from one call — the API assembles
 * the counts server-side rather than the browser pulling four lists and adding
 * them up, so the numbers are always of one moment.
 */
export const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    adminApi
      .summary()
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <Card>
        <EmptyState title="Could not load the dashboard" hint={error} />
      </Card>
    );
  }

  if (!summary) return <Loading label="Loading the dashboard" />;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          What the shop is holding and what has come in.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Revenue"
          value={formatPrice(summary.revenue)}
          hint="Cancelled orders excluded"
        />
        <Stat
          label="Orders"
          value={summary.orders}
          hint={`${summary.pendingOrders} still open`}
        />
        <Stat
          label="This week"
          value={formatPrice(summary.revenueThisWeek)}
          hint={`${summary.ordersThisWeek} order${summary.ordersThisWeek === 1 ? '' : 's'} in 7 days`}
        />
        <Stat
          label="Open enquiries"
          value={summary.openEnquiries}
          tone={summary.openEnquiries > 0 ? 'rose' : 'slate'}
          hint={`${summary.enquiries} received in total`}
        />
        <Stat
          label="Products"
          value={summary.products}
          hint={`across ${summary.categories} categories`}
        />
        <Stat
          label="Out of stock"
          value={summary.outOfStock}
          tone={summary.outOfStock > 0 ? 'rose' : 'slate'}
          hint={`${summary.lowStock} more running low`}
        />
        <Stat
          label="Deactivated"
          value={summary.unavailable}
          hint="Parked, not deleted"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr,1fr]">
        <Card
          title="Recent orders"
          subtitle="Newest first"
          actions={
            <Link to="/orders" className="text-xs font-semibold text-teal-700 hover:underline">
              All orders
            </Link>
          }
          bodyClass="p-0"
        >
          {summary.recentOrders.length === 0 ? (
            <EmptyState
              title="No orders yet"
              hint="Orders placed at checkout on the shop appear here straight away."
            />
          ) : (
            <Table head={['Order', 'Customer', 'Status', { key: 't', label: 'Total', align: 'right' }]}>
              {summary.recentOrders.map((order) => (
                <tr key={order.orderId} className="hover:bg-slate-50">
                  <Td className="font-mono text-xs text-slate-900">{order.orderId}</Td>
                  <Td>
                    <span className="block font-medium text-slate-800">{order.name}</span>
                    <span className="block text-xs text-slate-500">{order.city}</span>
                  </Td>
                  <Td>
                    <Badge tone={STATUS_TONE[order.status]}>
                      {STATUS_LABEL[order.status] ?? order.status}
                    </Badge>
                  </Td>
                  <Td align="right" className="font-semibold text-slate-900">
                    {formatPrice(order.totals.total)}
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        <div className="space-y-6">
          <Card title="Orders by status" bodyClass="p-4">
            <ul className="space-y-2">
              {summary.byStatus.map((row) => (
                <li key={row.status} className="flex items-center justify-between gap-3 text-sm">
                  <Badge tone={STATUS_TONE[row.status]}>
                    {STATUS_LABEL[row.status] ?? row.status}
                  </Badge>
                  <span className="font-semibold text-slate-800">{row.count}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card
            title="Latest enquiries"
            subtitle="Bulk quote requests"
            actions={
              <Link to="/enquiries" className="text-xs font-semibold text-teal-700 hover:underline">
                All enquiries
              </Link>
            }
            bodyClass="p-0"
          >
            {summary.recentEnquiries.length === 0 ? (
              <EmptyState title="No enquiries yet" />
            ) : (
              <ul className="divide-y divide-slate-100">
                {summary.recentEnquiries.map((enquiry) => (
                  <li key={enquiry.enquiryId} className="px-4 py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate text-sm font-medium text-slate-800">
                        {enquiry.name}
                      </span>
                      <Badge tone={enquiry.status === 'received' ? 'amber' : 'neutral'}>
                        {enquiry.status}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {enquiry.district} · {formatDate(enquiry.receivedAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card
            title="Running low"
            subtitle="20 or fewer left"
            actions={
              <Link to="/stock" className="text-xs font-semibold text-teal-700 hover:underline">
                Stock take
              </Link>
            }
            bodyClass="p-0"
          >
            {summary.lowStockProducts.length === 0 ? (
              <EmptyState title="Everything is well stocked" />
            ) : (
              <ul className="divide-y divide-slate-100">
                {summary.lowStockProducts.map((product) => (
                  <li key={product.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <span className="min-w-0 truncate text-sm text-slate-700">{product.name}</span>
                    <Badge tone={product.stock === 0 ? 'rose' : 'amber'}>
                      {product.stock === 0 ? 'Out' : `${product.stock} left`}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
