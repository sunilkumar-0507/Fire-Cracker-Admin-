import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';
import { formatDate } from '@/utils/format';
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
import { MessageCircle, Phone, Search, Trash2 } from '@/components/icons';
import { ENQUIRY_TONE } from '@/constants';
import { useEnquiryStatuses } from '@/lib/statuses';

/**
 * The enquiry book — requirement 11's "orders <em>or enquiries</em>".
 *
 * Two lists that are the same job: somebody wrote in and somebody has to
 * answer. Bulk enquiries carry a status because they are a pipeline — received,
 * quoted, won or closed. Contact messages do not, because there is nothing to
 * track about "they asked a question and we rang them back".
 *
 * The newsletter list sits here too. It is the same kind of record — somebody
 * handed the shop their address — and it is the only one on this screen that
 * can be removed, because an unsubscribe has to actually remove somebody.
 *
 * How long any of this survives depends on where the API keeps its data, and
 * it is worth knowing while reading this screen. On a database, all three are
 * kept. On the JSON files they last only as long as the API is running, and
 * the notification email is the durable copy — a permanent plain-text file of
 * names and phone numbers inside the folder the storefront is built from is a
 * liability the shop never asked for. The Database screen says which is in use.
 */

const TABS = [
  { id: 'enquiries', label: 'Bulk enquiries' },
  { id: 'messages', label: 'Contact messages' },
  { id: 'subscribers', label: 'Newsletter' },
];

/** What an empty list should say — each one names where the rows come from. */
const EMPTY = {
  enquiries: {
    title: 'No bulk enquiries yet',
    hint: 'They arrive from the bulk order form on the shop.',
  },
  messages: {
    title: 'No messages yet',
    hint: 'They arrive from the contact page on the shop.',
  },
  subscribers: {
    title: 'Nobody has subscribed yet',
    hint: 'Addresses arrive from the newsletter box in the shop footer.',
  },
};

/* ------------------------------- detail ---------------------------------- */

const EnquiryDrawer = ({ enquiry, onClose, onStatus, saving, statuses }) => {
  if (!enquiry) return null;

  const rows = [
    ['Reference', enquiry.enquiryId],
    ['Received', formatDate(enquiry.receivedAt)],
    ['Name', enquiry.name],
    ['Organisation', enquiry.organisation],
    ['Phone', enquiry.phone],
    ['Email', enquiry.email],
    ['District', enquiry.district],
    ['Quantity', enquiry.quantity],
    ['Budget', enquiry.budget],
  ].filter(([, value]) => value);

  return (
    <Drawer
      open
      onClose={onClose}
      title={enquiry.name}
      subtitle={`${enquiry.enquiryId} · ${enquiry.district}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="outline"
            // `tel:` rather than a copy button: the person reading this is
            // holding a phone and the next step is always a call.
            onClick={() => {
              window.location.href = `tel:${enquiry.phone}`;
            }}
            icon={<Phone size={13} />}
          >
            Call {enquiry.phone}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <div>
          <p className="mb-1.5 text-xs font-semibold text-slate-700">Status</p>
          <Select
            value={enquiry.status}
            disabled={saving}
            onChange={(e) => onStatus(enquiry.enquiryId, e.target.value)}
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status[0].toUpperCase() + status.slice(1)}
              </option>
            ))}
          </Select>
        </div>

        <dl className="grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-4 bg-white px-3 py-2.5">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {label}
              </dt>
              <dd className="min-w-0 break-words text-right text-sm text-slate-800">{value}</dd>
            </div>
          ))}
        </dl>

        {enquiry.message ? (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              What they wrote
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {enquiry.message}
            </p>
          </div>
        ) : null}
      </div>
    </Drawer>
  );
};

/* --------------------------------- page ---------------------------------- */

export const Enquiries = () => {
  const enquiryStatuses = useEnquiryStatuses();
  const [tab, setTab] = useState('enquiries');
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');

  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchRows = useCallback(async () => {
    setRows(null);
    setError(null);

    try {
      const page =
        tab === 'enquiries'
          ? await adminApi.enquiries.list({ status, q: query, pageSize: 100 })
          : tab === 'subscribers'
            ? await adminApi.subscribers.list({ q: query, pageSize: 200 })
            : await adminApi.messages.list({ pageSize: 100 });

      setRows(page.items);
    } catch (caught) {
      setError(caught.message);
      setRows([]);
    }
  }, [tab, status, query]);

  useEffect(() => {
    // A short debounce so typing in the search box is not one request per key.
    const timer = setTimeout(fetchRows, query ? 250 : 0);
    return () => clearTimeout(timer);
  }, [fetchRows, query]);

  const changeStatus = async (id, next) => {
    setSaving(true);
    try {
      const updated = await adminApi.enquiries.setStatus(id, next);
      setRows((current) => current.map((r) => (r.enquiryId === id ? updated : r)));
      setSelected(updated);
      toast.success(`Marked ${next}`);
    } catch (caught) {
      toast.error(caught.message);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Removing an address is the one destructive thing on this screen, and it is
   * not worth a confirmation dialog: the whole point of an unsubscribe is that
   * it is easy, and somebody re-subscribing costs one form submission.
   */
  const unsubscribe = async (email) => {
    setSaving(true);
    try {
      await adminApi.subscribers.remove(email);
      setRows((current) => current.filter((r) => r.email !== email));
      toast.success(`${email} removed`);
    } catch (caught) {
      toast.error(caught.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Enquiries</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Bulk quote requests and messages from the contact form.
          </p>
        </div>

        <div className="flex gap-1 rounded-lg bg-slate-200 p-1">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={
                tab === item.id
                  ? 'rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-sm'
                  : 'rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900'
              }
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <Card
        bodyClass="p-0"
        title={TABS.find((t) => t.id === tab).label}
        subtitle={rows ? `${rows.length} shown` : null}
        actions={
          tab === 'messages' ? null : (
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search
                  size={13}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={tab === 'enquiries' ? 'Name, phone, district' : 'Email address'}
                  className="h-8 w-52 pl-7 text-xs"
                />
              </div>

              {tab === 'enquiries' ? (
                <Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="h-8 w-auto py-0 text-xs"
                >
                  <option value="all">All statuses</option>
                  {enquiryStatuses.map((s) => (
                    <option key={s} value={s}>
                      {s[0].toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </Select>
              ) : null}
            </div>
          )
        }
      >
        {rows === null ? (
          <Loading label="Loading" />
        ) : error ? (
          <EmptyState
            title="Could not load this list"
            hint={error}
            action={<Button onClick={fetchRows}>Try again</Button>}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title={EMPTY[tab].title}
            hint={query ? 'Nothing matches that search.' : EMPTY[tab].hint}
          />
        ) : tab === 'subscribers' ? (
          <Table
            head={[
              'Email',
              'Subscribed',
              { key: 'actions', label: '', align: 'right' },
            ]}
          >
            {rows.map((row) => (
              <tr key={row.email} className="hover:bg-slate-50">
                <Td className="font-medium text-slate-900">{row.email}</Td>
                <Td className="whitespace-nowrap text-xs">{formatDate(row.subscribedAt)}</Td>
                <Td align="right">
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={saving}
                    onClick={() => unsubscribe(row.email)}
                    icon={<Trash2 size={12} />}
                  >
                    Remove
                  </Button>
                </Td>
              </tr>
            ))}
          </Table>
        ) : tab === 'enquiries' ? (
          <Table
            head={[
              'Reference',
              'Name',
              'District',
              'Quantity',
              'Received',
              'Status',
              { key: 'actions', label: '', align: 'right' },
            ]}
          >
            {rows.map((row) => (
              <tr key={row.enquiryId} className="hover:bg-slate-50">
                <Td className="font-mono text-xs text-slate-500">{row.enquiryId}</Td>
                <Td>
                  <span className="font-medium text-slate-900">{row.name}</span>
                  {row.organisation ? (
                    <span className="mt-0.5 block text-xs text-slate-500">{row.organisation}</span>
                  ) : null}
                </Td>
                <Td>{row.district}</Td>
                <Td>{row.quantity ?? '—'}</Td>
                <Td className="whitespace-nowrap text-xs">{formatDate(row.receivedAt)}</Td>
                <Td>
                  <Badge tone={ENQUIRY_TONE[row.status] ?? 'neutral'}>{row.status}</Badge>
                </Td>
                <Td align="right">
                  <Button size="sm" variant="outline" onClick={() => setSelected(row)}>
                    Open
                  </Button>
                </Td>
              </tr>
            ))}
          </Table>
        ) : (
          <Table head={['Reference', 'From', 'Subject', 'Received']}>
            {rows.map((row) => (
              <tr key={row.messageId} className="align-top hover:bg-slate-50">
                <Td className="font-mono text-xs text-slate-500">{row.messageId}</Td>
                <Td>
                  <span className="font-medium text-slate-900">{row.name}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{row.phone}</span>
                </Td>
                <Td>
                  {row.subject ? (
                    <span className="block text-sm font-medium text-slate-800">{row.subject}</span>
                  ) : null}
                  <span className="mt-0.5 flex items-start gap-1.5 text-xs leading-relaxed text-slate-600">
                    <MessageCircle size={12} className="mt-0.5 shrink-0 text-slate-400" />
                    {row.message}
                  </span>
                </Td>
                <Td className="whitespace-nowrap text-xs">{formatDate(row.receivedAt)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <EnquiryDrawer
        enquiry={selected}
        saving={saving}
        onClose={() => setSelected(null)}
        onStatus={changeStatus}
        statuses={enquiryStatuses}
      />
    </div>
  );
};

export default Enquiries;
