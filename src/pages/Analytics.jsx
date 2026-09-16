import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { adminApi } from '@/lib/api';
import { formatDay, formatNumber, formatPercent, formatPrice } from '@/utils/format';
import { Button, Card, EmptyState, Loading, Table, Td } from '@/ui';
import { Search } from '@/components/icons';

/**
 * Analytics — requirement 13.
 *
 * ---------------------------------------------------------------------------
 * Why the charts look the way they do
 *
 * Every mark on this page is **one hue, light to dark**. There is no
 * categorical palette here at all, and that is a decision rather than an
 * omission: none of this data's jobs is *identity*. The daily series are four
 * separate measures on four wildly different scales (views in the hundreds,
 * orders in single figures), so they are drawn as **small multiples** — four
 * charts, each with its own y-scale — rather than as four lines sharing one.
 *
 * That also avoids the single worst chart mistake available here. Plotting
 * views and revenue on one plot needs two y-axes, and a dual-axis chart lets
 * you make any two series appear to correlate by choosing the scales. Four
 * honest small charts beat one persuasive misleading one.
 *
 * The funnel is an *ordinal* ramp — ordered stages, so the blue steps darken
 * as the funnel narrows. Steps start at #86b6ef because anything lighter stops
 * clearing 2:1 against a white card and the first stage would dissolve into it.
 * ---------------------------------------------------------------------------
 */

/** Ordinal blue ramp — validated monotone, single hue, light end clears the card. */
const FUNNEL_STEPS = ['#86b6ef', '#5598e7', '#2a78d6', '#184f95'];

/** The one hue every magnitude bar and area chart is drawn in. */
const SERIES = '#2a78d6';

const RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
];

/* -------------------------------------------------------------------------- */
/* Stat tiles                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * A headline number is a stat tile, not a one-bar bar chart. Five of them is a
 * KPI row — the thing a dashboard is actually read for.
 */
const Stat = ({ label, value, hint }) => (
  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-1.5 text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
    {hint ? <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p> : null}
  </div>
);

/* -------------------------------------------------------------------------- */
/* Small-multiple area chart                                                   */
/* -------------------------------------------------------------------------- */

const W = 300;
const H = 72;

/**
 * One measure over the window.
 *
 * `preserveAspectRatio="none"` lets the plot stretch to whatever width the grid
 * gives it, and `vector-effect="non-scaling-stroke"` stops that stretch from
 * thickening the line with it — the usual reason a responsive SVG chart ends up
 * with a 6px stroke on a wide screen.
 *
 * The hover layer is a crosshair plus a tooltip rather than a dot: a circle
 * under a non-uniform scale draws as an ellipse, and a vertical rule reads
 * better on a 72px-tall plot anyway.
 */
const Spark = ({ title, points, format = formatNumber }) => {
  const gradientId = useId();
  const [hover, setHover] = useState(null);

  const values = points.map((p) => p.value);
  const max = Math.max(1, ...values);

  const x = (i) => (points.length <= 1 ? 0 : (i / (points.length - 1)) * W);
  const y = (v) => H - (v / max) * (H - 6) - 3;

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.value)}`).join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;

  const total = values.reduce((n, v) => n + v, 0);

  const onMove = (event) => {
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width === 0) return;

    const ratio = (event.clientX - box.left) / box.width;
    const index = Math.round(ratio * (points.length - 1));
    setHover(Math.min(points.length - 1, Math.max(0, index)));
  };

  const active = hover === null ? null : points[hover];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        {/* One series, so the title names it and no legend box is needed. */}
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
        <p className="text-sm font-semibold tabular-nums text-slate-900">{format(total)}</p>
      </div>

      <div
        className="relative mt-3"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`${title}: ${format(total)} over the period`}
          className="h-[72px] w-full touch-none"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES} stopOpacity="0.22" />
              <stop offset="100%" stopColor={SERIES} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          <path d={area} fill={`url(#${gradientId})`} />
          <path
            d={line}
            fill="none"
            stroke={SERIES}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />

          {active ? (
            <line
              x1={x(hover)}
              y1="0"
              x2={x(hover)}
              y2={H}
              stroke={SERIES}
              strokeWidth="1"
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
        </svg>

        {active ? (
          <div
            className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white shadow-lg"
            style={{ left: `${(hover / Math.max(1, points.length - 1)) * 100}%` }}
          >
            {formatDay(active.day)} · {format(active.value)}
          </div>
        ) : null}
      </div>

      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
        <span>{points.length ? formatDay(points[0].day) : ''}</span>
        <span>{points.length ? formatDay(points[points.length - 1].day) : ''}</span>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Funnel                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Ordered stages, one hue darkening down the funnel, with the drop-off between
 * them stated as a percentage rather than left to be eyeballed off bar lengths.
 *
 * Every figure is a count of **visits**, not events — "of the people who
 * looked, this many bought", which is the only sentence these percentages
 * actually support.
 *
 * A stage can legitimately overtake the one above it: somebody whose browser
 * kept a basket from last week reaches checkout in this window without having
 * added anything in it. Rather than clamp that to a tidy 100% and quietly lie,
 * the row says what happened. The bars are scaled to the largest stage, so the
 * shape stays readable when it does.
 */
const Funnel = ({ funnel }) => {
  const stages = [
    { label: 'Looked at a product', value: funnel.productViews },
    { label: 'Added to a basket', value: funnel.cartAdds, rate: funnel.viewToCartRate },
    { label: 'Reached checkout', value: funnel.checkoutStarts, rate: funnel.cartToCheckoutRate },
    { label: 'Placed an order', value: funnel.orders, rate: funnel.checkoutToOrderRate },
  ];

  const max = Math.max(1, ...stages.map((stage) => stage.value));

  return (
    <div className="grid gap-2.5">
      {stages.map((stage, index) => {
        const overtakes = stage.rate != null && stage.rate > 100;

        return (
          <div key={stage.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-xs font-medium text-slate-700">{stage.label}</span>
              <span className="text-xs tabular-nums text-slate-500">
                {formatNumber(stage.value)}
                {stage.value === 1 ? ' visit' : ' visits'}
                {stage.rate != null ? (
                  <span
                    className={
                      overtakes ? 'ml-2 font-semibold text-amber-700' : 'ml-2 font-semibold text-slate-900'
                    }
                  >
                    {formatPercent(stage.rate)}
                  </span>
                ) : null}
              </span>
            </div>

            {/* The track is the same neutral at every stage, so bar length is
                the only thing carrying magnitude. */}
            <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{
                  width: `${Math.max(1.5, (stage.value / max) * 100)}%`,
                  background: FUNNEL_STEPS[index],
                }}
              />
            </div>

            {overtakes ? (
              <p className="mt-1 text-[11px] leading-relaxed text-amber-700">
                More visits reached this step than the one above it — people arriving with a
                basket their browser kept from an earlier visit.
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Ranked list                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Past about seven rows, a table beats more colour — so these stay tables, with
 * a single-hue magnitude bar behind the count doing the comparing.
 */
const Ranked = ({ title, subtitle, rows, unit, empty }) => {
  const max = Math.max(1, ...rows.map((r) => r.count));

  return (
    <Card title={title} subtitle={subtitle} bodyClass={rows.length ? 'p-0' : undefined}>
      {rows.length === 0 ? (
        <EmptyState title={empty} hint="Nothing recorded in this window yet." />
      ) : (
        <ol className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <li key={row.ref} className="flex items-center gap-3 px-4 py-2.5">
              <span className="w-4 shrink-0 text-[11px] tabular-nums text-slate-400">
                {index + 1}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-slate-800" title={row.label}>
                  {row.label}
                </span>
                <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${Math.max(2, (row.count / max) * 100)}%`,
                      background: SERIES,
                    }}
                  />
                </span>
              </span>

              <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
                {formatNumber(row.count)}
                <span className="ml-1 text-[11px] font-normal text-slate-400">{unit}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
};

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export const Analytics = () => {
  const [days, setDays] = useState(30);
  const [result, setResult] = useState({ report: null, error: null, days: null });

  /** Bumped by "Try again", which is the only thing that re-runs a failed fetch. */
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;

    adminApi
      .analytics(days)
      .then((report) => {
        if (!cancelled) setResult({ report, error: null, days });
      })
      .catch((caught) => {
        if (!cancelled) setResult({ report: null, error: caught.message, days });
      });

    return () => {
      cancelled = true;
    };
  }, [days, attempt]);

  /*
   * "Loading" is derived rather than stored. The alternative — clearing the
   * report at the top of the effect — is a second render on every range change
   * and a synchronous setState inside an effect. Comparing the range the
   * result was fetched for against the one currently selected says the same
   * thing for free, and it cannot get out of step with the request.
   */
  const stale = result.days !== days;
  const report = stale ? null : result.report;
  const error = stale ? null : result.error;

  const series = useMemo(() => {
    if (!report) return null;

    const daily = report.daily ?? [];
    return {
      views: daily.map((d) => ({ day: d.day, value: d.views })),
      cartAdds: daily.map((d) => ({ day: d.day, value: d.cartAdds })),
      orders: daily.map((d) => ({ day: d.day, value: d.orders })),
      revenue: daily.map((d) => ({ day: d.day, value: d.revenue })),
    };
  }, [report]);

  return (
    <div className="grid gap-4">
      {/* Filters in one row above the charts. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Analytics</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            What gets looked at, searched for and bought. Counted on our own server — no
            third-party tag, no cookies, nothing that identifies a customer.
          </p>
        </div>

        <div className="flex gap-1 rounded-lg bg-slate-200 p-1">
          {RANGES.map((range) => (
            <button
              key={range.days}
              type="button"
              onClick={() => setDays(range.days)}
              className={
                days === range.days
                  ? 'rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-sm'
                  : 'rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900'
              }
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <Card>
          <EmptyState
            title="Could not load the report"
            hint={error}
            action={<Button onClick={retry}>Try again</Button>}
          />
        </Card>
      ) : !report ? (
        <Card>
          <Loading label="Building the report" />
        </Card>
      ) : report.totalEvents === 0 ? (
        <Card>
          <EmptyState
            title="Nothing recorded yet"
            hint="Events arrive as people browse the shop. Open the storefront, look at a few products, and they will show up here."
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Stat
              label="Visits"
              value={formatNumber(report.funnel.sessions)}
              hint="Distinct browser tabs"
            />
            <Stat
              label="Product views"
              value={formatNumber(report.funnel.productViewEvents)}
              hint={`${formatNumber(report.funnel.productViews)} of the visits`}
            />
            <Stat
              label="Added to basket"
              value={formatNumber(report.funnel.cartAddEvents)}
              hint={`${formatPercent(report.funnel.viewToCartRate)} of visits that looked`}
            />
            <Stat
              label="Orders"
              value={formatNumber(report.funnel.orders)}
              hint={`${formatPercent(report.funnel.checkoutToOrderRate)} of visits that reached checkout`}
            />
            <Stat
              label="Order value"
              value={formatPrice(report.daily.reduce((n, d) => n + d.revenue, 0))}
              hint={`Over ${report.days} days`}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Spark title="Product views" points={series.views} />
            <Spark title="Added to basket" points={series.cartAdds} />
            <Spark title="Orders" points={series.orders} />
            <Spark title="Order value" points={series.revenue} format={formatPrice} />
          </div>

          {/* The table view the charts above are read from. Collapsed, because
              it is the accessible alternative rather than the main event. */}
          <Card bodyClass="p-0">
            <details className="group">
              <summary className="cursor-pointer list-none px-4 py-3 text-xs font-semibold text-slate-600 hover:text-slate-900">
                Show the daily figures as a table
              </summary>
              <div className="border-t border-slate-200">
                <Table
                  head={[
                    'Day',
                    { key: 'v', label: 'Views', align: 'right' },
                    { key: 'c', label: 'Basket', align: 'right' },
                    { key: 'o', label: 'Orders', align: 'right' },
                    { key: 'r', label: 'Value', align: 'right' },
                  ]}
                >
                  {report.daily.map((day) => (
                    <tr key={day.day}>
                      <Td className="whitespace-nowrap text-xs">{formatDay(day.day)}</Td>
                      <Td align="right">{formatNumber(day.views)}</Td>
                      <Td align="right">{formatNumber(day.cartAdds)}</Td>
                      <Td align="right">{formatNumber(day.orders)}</Td>
                      <Td align="right">{formatPrice(day.revenue)}</Td>
                    </tr>
                  ))}
                </Table>
              </div>
            </details>
          </Card>

          <Card
            title="How a visit turns into an order"
            subtitle={`Visits, not clicks · last ${report.days} days`}
          >
            <Funnel funnel={report.funnel} />
          </Card>

          <div className="grid gap-3 lg:grid-cols-2">
            <Ranked
              title="Most viewed products"
              subtitle="What people are actually looking at"
              rows={report.topProducts}
              unit="views"
              empty="No product views yet"
            />
            <Ranked
              title="Most added to a basket"
              subtitle="Intent, rather than curiosity"
              rows={report.mostAddedToCart}
              unit="adds"
              empty="No basket activity yet"
            />
            <Ranked
              title="Most viewed categories"
              rows={report.topCategories}
              unit="views"
              empty="No category views yet"
            />
            <Ranked
              title="What people search for"
              rows={report.topSearches}
              unit="searches"
              empty="No searches yet"
            />
          </div>

          {/* Given its own card rather than a fifth ranked list: a search that
              found nothing is the one row on this page that names something to
              go and do. */}
          <Card
            title="Searches that found nothing"
            subtitle="Customers naming things the catalogue does not have"
          >
            {report.searchesWithNoResults.length === 0 ? (
              <EmptyState
                title="Every search found something"
                hint="Nothing was searched for in this window that the catalogue could not answer."
              />
            ) : (
              <ul className="flex flex-wrap gap-2">
                {report.searchesWithNoResults.map((row) => (
                  <li
                    key={row.ref}
                    className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-900"
                  >
                    <Search size={12} className="shrink-0 text-amber-600" />
                    <span className="font-medium">{row.ref}</span>
                    <span className="tabular-nums text-amber-700">×{row.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default Analytics;
