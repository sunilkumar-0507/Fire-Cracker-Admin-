import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';
import { reload, products as allProducts } from '@/lib/catalog';
import { formatDate, formatPrice } from '@/utils/format';
import { AVAILABILITY_LABEL, AVAILABILITY_TONE } from '@/constants';
import ProductThumb from '@/components/ProductThumb';
import {
  Badge,
  Button,
  Card,
  Drawer,
  EmptyState,
  Input,
  Loading,
  Select,
  Table,
  Td,
} from '@/ui';

/**
 * Stock monitoring.
 *
 * Three numbers per product, from three different places: what was received
 * (the intake ledger), what left (the order book), and what is on the shelf
 * (the catalogue). Keeping them side by side is the whole point — any one of
 * them alone can look healthy while the other two disagree.
 *
 * The Stock screen next door is for correcting a count. This one is for
 * understanding it, and for recording a delivery, which is the only way stock
 * should normally go up.
 */

const Stat = ({ label, value, hint, tone = 'slate' }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <p
      className={
        tone === 'rose'
          ? 'mt-1 font-display text-xl font-semibold text-rose-600 sm:text-2xl'
          : tone === 'emerald'
            ? 'mt-1 font-display text-xl font-semibold text-emerald-600 sm:text-2xl'
            : 'mt-1 font-display text-xl font-semibold text-slate-900 sm:text-2xl'
      }
    >
      {value}
    </p>
    {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
  </div>
);

/** A bar showing sold against received, so the split reads without arithmetic. */
const SoldBar = ({ sold, intake }) => {
  if (!intake) return <span className="text-xs text-slate-400">—</span>;
  const pct = Math.min(100, Math.round((sold / intake) * 100));

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 sm:w-24">
        <div className="h-full rounded-full bg-teal-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="tabular-nums text-[11px] text-slate-500">{pct}%</span>
    </div>
  );
};

const emptyIntake = { productId: '', quantity: '', supplier: '', note: '' };

export const Inventory = () => {
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [view, setView] = useState('all');
  const [intake, setIntake] = useState(null);
  const [saving, setSaving] = useState(false);

  /** Pulls the report again. Awaited by the intake form after a save. */
  const load = useCallback(
    () =>
      adminApi.inventory
        .report()
        .then((data) => {
          setReport(data);
          setError('');
        })
        .catch((err) => setError(err.message)),
    [],
  );

  // Same shape as the dashboard's: the state lands in the promise callback, and
  // a report that arrives after the screen has moved on is dropped.
  useEffect(() => {
    let cancelled = false;

    adminApi.inventory
      .report()
      .then((data) => {
        if (!cancelled) {
          setReport(data);
          setError('');
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    if (!report) return [];
    const term = query.trim().toLowerCase();

    return report.rows.filter((r) => {
      if (term && !r.name.toLowerCase().includes(term) && r.code !== term && r.category !== term) {
        return false;
      }
      if (view === 'out') return r.holding <= 0;
      if (view === 'low') return r.holding > 0 && r.holding <= 20;
      if (view === 'sold') return r.sold > 0;
      if (view === 'unaccounted') return r.unaccounted !== 0;
      return true;
    });
  }, [report, query, view]);

  const save = async () => {
    setSaving(true);
    try {
      const entry = await adminApi.inventory.record({
        productId: intake.productId,
        quantity: Number(intake.quantity),
        supplier: intake.supplier.trim() || null,
        note: intake.note.trim() || null,
      });

      // The ledger moved the stock level too, so the catalogue the other
      // screens read from is now a version behind.
      await reload();
      await load();
      setIntake(null);

      toast.success(
        `${entry.quantity > 0 ? '+' : ''}${entry.quantity} recorded against ${
          allProducts.find((p) => p.id === entry.productId)?.name ?? entry.productId
        }`,
      );
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return (
      <Card>
        <EmptyState title="Could not load the stock report" hint={error} />
      </Card>
    );
  }

  if (!report) return <Loading label="Working out what is on the shelf" />;

  const unaccounted = report.rows.reduce((sum, r) => sum + Math.abs(r.unaccounted), 0);

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-semibold text-slate-900 sm:text-2xl">Stock</h1>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
            What came in, what sold, and what is left.
          </p>
        </div>
        <Button onClick={() => setIntake({ ...emptyIntake })}>Record intake</Button>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Received"
          value={report.totalIntake.toLocaleString('en-IN')}
          hint="Units in the ledger"
        />
        <Stat
          label="Sold"
          value={report.totalSold.toLocaleString('en-IN')}
          hint={`${formatPrice(report.totalRevenue)} of trade`}
          tone="emerald"
        />
        <Stat
          label="Holding"
          value={report.totalHolding.toLocaleString('en-IN')}
          hint={`${formatPrice(report.holdingValue)} on the shelf`}
        />
        <Stat
          label="Needs attention"
          value={report.outOfStock + report.lowStock}
          hint={`${report.outOfStock} out, ${report.lowStock} running low`}
          tone={report.outOfStock > 0 ? 'rose' : 'slate'}
        />
      </div>

      {unaccounted > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <strong className="font-semibold">{unaccounted.toLocaleString('en-IN')} units unaccounted for.</strong>{' '}
          Received minus sold does not match what the shelf says. That is normal for stock
          that was on hand before the ledger existed — for anything since, it is breakage,
          a miscount, or a sale that never went through the till.{' '}
          <button
            type="button"
            onClick={() => setView('unaccounted')}
            className="font-semibold underline underline-offset-2"
          >
            Show them
          </button>
        </div>
      ) : null}

      <Card
        title="Best sellers"
        subtitle="By units actually despatched — cancelled orders do not count"
        bodyClass="p-0"
      >
        {report.bestSellers.length === 0 ? (
          <EmptyState
            title="Nothing has sold yet"
            hint="This fills in from the order book as orders come through."
          />
        ) : (
          <Table head={['#', 'Product', { key: 'sold', label: 'Sold', align: 'right' }, { key: 'rev', label: 'Revenue', align: 'right' }, { key: 'left', label: 'Left', align: 'right' }]}>
            {report.bestSellers.map((r, i) => (
              <tr key={r.productId} className="hover:bg-slate-50">
                <Td className="w-8 text-slate-400">{i + 1}</Td>
                <Td>
                  <div className="flex items-center gap-3">
                    <ProductThumb
                      source={r.image}
                      className="h-9 w-9 shrink-0 rounded-lg border border-slate-200"
                    />
                    <div className="min-w-0">
                      <span className="block truncate font-medium text-slate-800">{r.name}</span>
                      <span className="text-[11px] text-slate-500">#{r.code}</span>
                    </div>
                  </div>
                </Td>
                <Td align="right" className="font-semibold tabular-nums">{r.sold}</Td>
                <Td align="right" className="tabular-nums">{formatPrice(r.revenue)}</Td>
                <Td align="right" className="tabular-nums">{r.holding}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card
        title="Every product"
        subtitle={`${rows.length} of ${report.products}`}
        bodyClass="p-0"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, code or category"
              className="h-9 w-40 sm:w-56"
            />
            <Select value={view} onChange={(e) => setView(e.target.value)} className="h-9 w-32 sm:w-40">
              <option value="all">Everything</option>
              <option value="sold">Has sold</option>
              <option value="low">Running low</option>
              <option value="out">Out of stock</option>
              <option value="unaccounted">Unaccounted</option>
            </Select>
          </div>
        }
      >
        {rows.length === 0 ? (
          <EmptyState title="Nothing matches" hint="Try a different search or filter." />
        ) : (
          <Table
            head={[
              'Product',
              { key: 'in', label: 'In', align: 'right' },
              { key: 'sold', label: 'Sold', align: 'right' },
              { key: 'rate', label: 'Sell-through' },
              { key: 'hold', label: 'Holding', align: 'right' },
              { key: 'diff', label: 'Diff', align: 'right' },
              'State',
            ]}
          >
            {rows.map((r) => (
              <tr key={r.productId} className="hover:bg-slate-50">
                <Td>
                  <div className="flex items-center gap-3">
                    <ProductThumb
                      source={r.image}
                      className="h-9 w-9 shrink-0 rounded-lg border border-slate-200"
                    />
                    <div className="min-w-0">
                      <span className="block truncate font-medium text-slate-800">{r.name}</span>
                      <span className="text-[11px] text-slate-500">
                        #{r.code}
                        {r.lastIntakeAt ? ` · last in ${formatDate(r.lastIntakeAt)}` : ''}
                      </span>
                    </div>
                  </div>
                </Td>
                <Td align="right" className="tabular-nums">{r.intake || '—'}</Td>
                <Td align="right" className="tabular-nums">{r.sold || '—'}</Td>
                <Td><SoldBar sold={r.sold} intake={r.intake} /></Td>
                <Td align="right" className="font-semibold tabular-nums">{r.holding}</Td>
                <Td
                  align="right"
                  className={
                    r.unaccounted === 0
                      ? 'tabular-nums text-slate-300'
                      : 'tabular-nums font-semibold text-amber-600'
                  }
                >
                  {r.unaccounted === 0 ? '—' : r.unaccounted > 0 ? `+${r.unaccounted}` : r.unaccounted}
                </Td>
                <Td>
                  <Badge tone={AVAILABILITY_TONE[r.availability]}>
                    {AVAILABILITY_LABEL[r.availability]}
                  </Badge>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card title="Recent intake" subtitle="The ledger, newest first" bodyClass="p-0">
        {report.recentIntake.length === 0 ? (
          <EmptyState
            title="Nothing recorded yet"
            hint="Use “Record intake” each time stock arrives, and these three columns start to reconcile."
          />
        ) : (
          <Table head={['When', 'Product', 'Supplier', { key: 'qty', label: 'Qty', align: 'right' }]}>
            {report.recentIntake.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50">
                <Td className="whitespace-nowrap text-slate-500">{formatDate(e.receivedAt)}</Td>
                <Td className="truncate">
                  {allProducts.find((p) => p.id === e.productId)?.name ?? e.productId}
                  {e.note ? <span className="block text-[11px] text-slate-400">{e.note}</span> : null}
                </Td>
                <Td className="text-slate-500">{e.supplier ?? '—'}</Td>
                <Td
                  align="right"
                  className={
                    e.quantity > 0
                      ? 'font-semibold tabular-nums text-emerald-600'
                      : 'font-semibold tabular-nums text-rose-600'
                  }
                >
                  {e.quantity > 0 ? `+${e.quantity}` : e.quantity}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Drawer
        open={Boolean(intake)}
        onClose={() => setIntake(null)}
        title="Record intake"
        subtitle="Raises the stock level and writes a dated line in the ledger"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIntake(null)}>Cancel</Button>
            <Button
              onClick={save}
              disabled={saving || !intake?.productId || !Number(intake?.quantity)}
            >
              {saving ? 'Recording…' : 'Record'}
            </Button>
          </>
        }
      >
        {intake ? (
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-700">Product</span>
              <Select
                value={intake.productId}
                onChange={(e) => setIntake({ ...intake, productId: e.target.value })}
              >
                <option value="">Choose a product…</option>
                {allProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.code} · {p.name} (holding {p.stock})
                  </option>
                ))}
              </Select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-700">Quantity received</span>
              <Input
                type="number"
                value={intake.quantity}
                onChange={(e) => setIntake({ ...intake, quantity: e.target.value })}
                placeholder="200"
              />
              <span className="mt-1 block text-[11px] text-slate-500">
                A negative number writes off breakage or a miscount. The ledger is
                append-only, so a mistake is corrected with another line, never erased.
              </span>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-700">Supplier</span>
              <Input
                value={intake.supplier}
                onChange={(e) => setIntake({ ...intake, supplier: e.target.value })}
                placeholder="Optional — who it came from"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-700">Note</span>
              <Input
                value={intake.note}
                onChange={(e) => setIntake({ ...intake, note: e.target.value })}
                placeholder="Optional — batch number, invoice, anything"
              />
            </label>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
};

export default Inventory;
