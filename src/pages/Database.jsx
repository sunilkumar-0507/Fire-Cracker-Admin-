import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';
import { formatDate, formatNumber } from '@/utils/format';
import {
  Badge,
  Button,
  Card,
  Drawer,
  EmptyState,
  Loading,
  Table,
  Td,
} from '@/ui';
import { AlertTriangle, Check, Database as DatabaseIcon, Download, Info, Spinner } from '@/components/icons';

/**
 * Where the shop's data is kept.
 *
 * The API runs on the JSON files in `src/data` until a connection string is
 * configured, and on MySQL or MariaDB once one is. Everything else about it is
 * identical — the same endpoints, the same responses, the same screens — which
 * is exactly why this screen needs to exist: without it there is no way to
 * tell the two apart from the outside, and "is it actually saving anywhere"
 * becomes a question only a server log can answer.
 *
 * Three of the four buttons here change something, so each says what it will
 * do before it does it, and the destructive one asks twice.
 */

/* ----------------------------- the headline ------------------------------ */

/**
 * The one sentence worth reading first.
 *
 * Three states, and they are genuinely different situations rather than three
 * shades of the same one: running on files (fine, and probably deliberate),
 * running on a database (fine), or configured for a database it cannot reach
 * (the shop is down, and this is the screen that says why).
 */
const Headline = ({ status }) => {
  if (!status.enabled) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
        <Info size={16} className="mt-0.5 shrink-0 text-slate-400" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">Running on the JSON files</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
            The catalogue, orders and the stock ledger are read from and written back to{' '}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">src/data</code>. That
            works, and it is what the shop ships with — but enquiries, contact messages and
            newsletter addresses are held only for as long as the API is running.
          </p>
        </div>
      </div>
    );
  }

  if (!status.canConnect) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3.5">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-500" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-rose-900">Configured for MySQL, but cannot reach it</p>
          <p className="mt-0.5 break-words text-xs leading-relaxed text-rose-800">
            {status.error ?? 'The server did not answer.'}
          </p>
          {status.connectionString ? (
            <p className="mt-1.5 break-all font-mono text-[11px] text-rose-700">
              {status.connectionString}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5">
      <Check size={16} className="mt-0.5 shrink-0 text-emerald-600" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-emerald-900">
          Connected to <span className="font-mono">{status.database}</span>
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-emerald-800">
          {status.serverVersion ? `MySQL ${status.serverVersion}. ` : ''}
          Everything the shop knows is kept here.
        </p>
        {status.connectionString ? (
          <p className="mt-1.5 break-all font-mono text-[11px] text-emerald-700">
            {status.connectionString}
          </p>
        ) : null}
      </div>
    </div>
  );
};

const Stat = ({ label, value, hint, tone = 'slate' }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <p
      className={
        tone === 'amber'
          ? 'mt-1 font-display text-xl font-semibold text-amber-600 sm:text-2xl'
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

/* -------------------------------- setup ---------------------------------- */

/**
 * What to type, for the person who has a database and no idea where the
 * setting lives. Shown only while there is no connection string, because after
 * that it is answering a question nobody is asking any more.
 */
const SetupNote = () => (
  <Card
    title="Moving onto MySQL or MariaDB"
    subtitle="One setting, then restart the API — nothing else changes"
  >
    <ol className="grid gap-3 text-xs leading-relaxed text-slate-600">
      <li>
        <span className="font-semibold text-slate-800">1. Create an empty database.</span> Anything
        will do — a local MySQL, a MariaDB on the shop's own server, or whatever the host provides.
        The API creates its own tables.
      </li>
      <li>
        <span className="font-semibold text-slate-800">2. Put the connection string in</span>{' '}
        <code className="rounded bg-slate-100 px-1 py-0.5">api/GopiCrackers.Api/appsettings.json</code>:
        <pre className="mt-1.5 overflow-x-auto rounded-lg bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-200">
{`"Storefront": {
  "Database": {
    "ConnectionString": "Server=localhost;Port=3306;Database=gopicrackers;User ID=gopi;Password=…;",
    "ServerVersion": "8.0.36-mysql"
  }
}`}
        </pre>
        <span className="mt-1.5 block">
          The environment variable <code className="rounded bg-slate-100 px-1 py-0.5">ConnectionStrings__GopiCrackers</code>{' '}
          works too, which is usually easier on a managed host.
        </span>
      </li>
      <li>
        <span className="font-semibold text-slate-800">3. Restart the API.</span> It applies the
        schema, copies the current catalogue, order book and stock ledger across, and carries on.
        Nothing is lost and nothing needs re-entering.
      </li>
    </ol>
  </Card>
);

/* --------------------------------- page ---------------------------------- */

export const Database = () => {
  const { reload: reloadCatalogue } = useOutletContext();

  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  /** Which action is running, so only that button spins. */
  const [busy, setBusy] = useState('');
  const [confirmReimport, setConfirmReimport] = useState(false);

  const load = useCallback(async () => {
    try {
      setStatus(await adminApi.database.status());
      setError(null);
    } catch (caught) {
      setError(caught.message);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    adminApi.database
      .status()
      .then((data) => {
        if (!cancelled) {
          setStatus(data);
          setError(null);
        }
      })
      .catch((caught) => {
        if (!cancelled) setError(caught.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Every button here is the same shape: run it, say what happened, then ask
   * the API where things stand rather than guessing from the response.
   */
  const run = async (name, action, describe) => {
    setBusy(name);
    try {
      const result = await action();
      toast.success(describe(result));
      await load();
    } catch (caught) {
      toast.error(caught.message);
    } finally {
      setBusy('');
    }
  };

  const migrate = () =>
    run('migrate', () => adminApi.database.migrate(), (r) => r.message);

  const seed = () =>
    run(
      'seed',
      async () => {
        const result = await adminApi.database.seed(false);
        // Seeding changes the catalogue the other screens read from.
        if (result.seeded) await reloadCatalogue();
        return result;
      },
      (r) =>
        r.seeded
          ? `Seeded ${formatNumber(r.products)} products, ${formatNumber(r.orders)} orders`
          : r.note ?? 'Nothing was empty, so nothing was seeded.',
    );

  const reimport = () => {
    setConfirmReimport(false);
    return run(
      'reimport',
      async () => {
        const result = await adminApi.database.seed(true);
        if (result.seeded) await reloadCatalogue();
        return result;
      },
      (r) => `Re-imported ${formatNumber(r.products)} products from the JSON files`,
    );
  };

  const reloadFromStore = () =>
    run(
      'reload',
      async () => {
        const result = await adminApi.database.reload();
        await reloadCatalogue();
        return result;
      },
      (r) => `Re-read ${formatNumber(r.products)} products from ${r.backend}`,
    );

  /**
   * Re-reads the status. No toast: the "Checked …" line at the foot of the
   * screen updates, which is the answer to the only question this asks.
   */
  const refresh = async () => {
    setBusy('status');
    try {
      await load();
    } finally {
      setBusy('');
    }
  };

  /**
   * Downloads the export as a file.
   *
   * A link to the endpoint would not work: it needs the passcode header, and a
   * browser navigation cannot carry one. So the JSON comes back through the
   * same authenticated client as everything else and is turned into a file
   * here.
   */
  const download = async () => {
    setBusy('export');
    try {
      const data = await adminApi.database.export();
      const stamp = new Date().toISOString().slice(0, 10);

      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
      );

      const link = document.createElement('a');
      link.href = url;
      link.download = `skv-pyros-${stamp}.json`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success('Backup downloaded');
    } catch (caught) {
      toast.error(caught.message);
    } finally {
      setBusy('');
    }
  };

  if (error) {
    return (
      <Card>
        <EmptyState
          title="Could not reach the API"
          hint={error}
          action={<Button onClick={load}>Try again</Button>}
        />
      </Card>
    );
  }

  if (!status) return <Loading label="Asking the API where the data lives" />;

  const rows = status.tables.reduce((sum, t) => sum + t.rows, 0);
  const connected = status.enabled && status.canConnect;

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-semibold text-slate-900 sm:text-2xl">Database</h1>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
            Where the shop's data is kept, and what state it is in.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            busy={busy === 'export'}
            onClick={download}
            icon={<Download size={13} />}
          >
            Download a backup
          </Button>
          <Button
            variant="outline"
            busy={busy === 'status'}
            onClick={refresh}
            icon={<Spinner size={13} />}
          >
            Refresh
          </Button>
        </div>
      </header>

      <Headline status={status} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Backend"
          value={status.backend === 'mysql' ? 'MySQL' : 'Files'}
          hint={status.backend === 'mysql' ? (status.database ?? 'Not connected') : 'src/data/*.json'}
          tone={status.backend === 'mysql' ? 'emerald' : 'slate'}
        />
        <Stat
          label="Tables"
          value={connected ? status.tables.length : '—'}
          hint={connected ? 'In the schema' : 'No database configured'}
        />
        <Stat
          label="Rows"
          value={connected ? formatNumber(rows) : '—'}
          hint={connected ? 'Across every table' : null}
        />
        <Stat
          label="Migrations"
          value={connected ? status.appliedMigrations.length : '—'}
          hint={
            status.pendingMigrations.length > 0
              ? `${status.pendingMigrations.length} still to apply`
              : connected
                ? 'Schema is up to date'
                : null
          }
          tone={status.pendingMigrations.length > 0 ? 'amber' : 'slate'}
        />
      </div>

      {status.enabled && status.error && status.canConnect ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
          <strong className="font-semibold">The database answered, but not to everything.</strong>{' '}
          {status.error}
        </div>
      ) : null}

      {status.enabled ? (
        <Card
          title="Maintenance"
          subtitle="The API does the first two on its own at startup — these are for when it has been told not to"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Action
              title="Apply migrations"
              hint={
                status.pendingMigrations.length > 0
                  ? `${status.pendingMigrations.length} pending: ${status.pendingMigrations.join(', ')}`
                  : 'Nothing pending. Safe to run anyway.'
              }
              label="Apply"
              busy={busy === 'migrate'}
              disabled={Boolean(busy)}
              onClick={migrate}
              highlight={status.pendingMigrations.length > 0}
            />
            <Action
              title="Seed what is empty"
              hint="Copies the JSON catalogue into any table that has nothing in it. Never overwrites."
              label="Seed"
              busy={busy === 'seed'}
              disabled={Boolean(busy)}
              onClick={seed}
            />
            <Action
              title="Reload the catalogue"
              hint="Re-reads what the API serves from the database — for a price list imported into MySQL directly, or a row edited by hand."
              label="Reload"
              busy={busy === 'reload'}
              disabled={Boolean(busy)}
              onClick={reloadFromStore}
            />
            <Action
              title="Re-import the catalogue from the files"
              hint="Replaces every product, category, combo and offer with the JSON version. Orders, the stock ledger and analytics are never touched."
              label="Re-import"
              danger
              busy={busy === 'reimport'}
              disabled={Boolean(busy)}
              onClick={() => setConfirmReimport(true)}
            />
          </div>
        </Card>
      ) : (
        <SetupNote />
      )}

      {connected ? (
        <Card title="Tables" subtitle="Row counts, as of this moment" bodyClass="p-0">
          {status.tables.length === 0 ? (
            <EmptyState
              title="No tables yet"
              hint="The schema has not been applied. Use “Apply migrations” above."
            />
          ) : (
            <Table head={['Table', { key: 'rows', label: 'Rows', align: 'right' }]}>
              {status.tables.map((t) => (
                <tr key={t.table} className="hover:bg-slate-50">
                  <Td className="font-mono text-xs text-slate-700">{t.table}</Td>
                  <Td
                    align="right"
                    className={t.rows === 0 ? 'tabular-nums text-slate-300' : 'font-semibold tabular-nums'}
                  >
                    {t.rows === 0 ? 'empty' : formatNumber(t.rows)}
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      ) : null}

      {connected && (status.appliedMigrations.length > 0 || status.pendingMigrations.length > 0) ? (
        <Card title="Migrations" subtitle="Every schema change, in the order it was written">
          <ul className="grid gap-1.5">
            {status.appliedMigrations.map((name) => (
              <li key={name} className="flex items-center gap-2 text-xs">
                <Badge tone="emerald">applied</Badge>
                <span className="truncate font-mono text-slate-600">{name}</span>
              </li>
            ))}
            {status.pendingMigrations.map((name) => (
              <li key={name} className="flex items-center gap-2 text-xs">
                <Badge tone="amber">pending</Badge>
                <span className="truncate font-mono text-slate-600">{name}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
        <DatabaseIcon size={11} />
        Checked {formatDate(status.checkedAt)}
      </p>

      <Drawer
        open={confirmReimport}
        onClose={() => setConfirmReimport(false)}
        title="Re-import the catalogue?"
        subtitle="This replaces what is in the database with what is in the files"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmReimport(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={reimport}>
              Re-import
            </Button>
          </>
        }
      >
        <div className="grid gap-4 text-sm leading-relaxed text-slate-700">
          <p>
            Every product, category, combo pack and offer in the database will be replaced by the
            version in <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">src/data</code>.
          </p>
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
            <strong className="font-semibold">Any catalogue edit made here since the last import
            will be lost</strong> — a price changed on the Products screen, a product deactivated, a
            stock level corrected. This is the right button after re-running the price-list
            importer, and the wrong one at any other time.
          </p>
          <p className="text-xs text-slate-500">
            Orders, the stock intake ledger, enquiries and analytics are never overwritten, whatever
            this does. A file cannot be a more recent truth about the shop's own trade than the
            database is.
          </p>
        </div>
      </Drawer>
    </div>
  );
};

/** One maintenance button with the sentence that explains it. */
const Action = ({ title, hint, label, onClick, busy, disabled, danger, highlight }) => (
  <div
    className={
      highlight
        ? 'flex items-start justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3'
        : 'flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3'
    }
  >
    <div className="min-w-0">
      <p className="text-sm font-medium text-slate-800">{title}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{hint}</p>
    </div>
    <Button
      size="sm"
      variant={danger ? 'danger' : 'outline'}
      busy={busy}
      disabled={disabled}
      onClick={onClick}
      className="mt-0.5"
    >
      {label}
    </Button>
  </div>
);

export default Database;
