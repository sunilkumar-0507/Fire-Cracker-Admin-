import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';
import { offers } from '@/lib/catalog';
import { formatPrice } from '@/utils/format';
import { ACCENT_KEYS } from '@/constants/accents';
import {
  Badge,
  Button,
  Card,
  Drawer,
  EmptyState,
  Field,
  Input,
  LinesInput,
  Select,
  Table,
  Td,
  Textarea,
  Toggle,
} from '@/ui';
import { Plus, Trash2 } from '@/components/icons';
import { ART_TYPES } from '@/constants';


/** A month out, which is the useful default for a festival offer. */
const defaultEnd = () => {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date.toISOString().slice(0, 10);
};

const blank = () => ({
  code: '',
  title: '',
  subtitle: '',
  description: '',
  type: 'percentage',
  value: 10,
  minOrder: 0,
  art: 'flowerpot',
  tone: 'amber',
  badge: '',
  endsAt: defaultEnd(),
  fallbackHours: 48,
  featured: false,
  terms: [],
});

const fromOffer = (o) => ({
  code: o.code,
  title: o.title,
  subtitle: o.subtitle ?? '',
  description: o.description,
  type: o.type,
  value: o.value,
  minOrder: o.minOrder,
  art: o.art,
  tone: o.tone ?? 'amber',
  badge: o.badge ?? '',
  endsAt: (o.endsAt ?? '').slice(0, 10),
  fallbackHours: o.fallbackHours ?? 48,
  featured: o.featured,
  terms: [...(o.terms ?? [])],
});

/**
 * Discounts.
 *
 * An offer here is the coupon the checkout accepts and the card the shop shows —
 * the same record drives both. The catalogue's own "75% off" is not one of
 * these: that is the gap between a product's price and its MRP, edited on the
 * product itself.
 */
export const Discounts = () => {
  const { reload } = useOutletContext();
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState('');

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        ...editing.draft,
        code: editing.draft.code.trim().toUpperCase(),
        // The API takes a full timestamp; the form only asks for a day, so the
        // offer runs to the end of the one chosen rather than its first minute.
        endsAt: new Date(`${editing.draft.endsAt}T23:59:59`).toISOString(),
      };

      if (editing.id) await adminApi.offers.update(editing.id, body);
      else await adminApi.offers.create(body);

      await reload();
      toast.success(editing.id ? 'Discount saved' : 'Discount created');
      setEditing(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (offer) => {
    if (!window.confirm(`Delete ${offer.code}? Customers using it at checkout will stop being able to.`))
      return;

    setDeleting(offer.id);
    try {
      await adminApi.offers.remove(offer.id);
      await reload();
      toast.success(`${offer.code} deleted`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting('');
    }
  };

  const set = (key) => (event) =>
    setEditing((prev) => ({ ...prev, draft: { ...prev.draft, [key]: event.target.value } }));

  const setNumber = (key) => (event) =>
    setEditing((prev) => ({
      ...prev,
      draft: { ...prev.draft, [key]: event.target.value === '' ? '' : Number(event.target.value) },
    }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-slate-900 sm:text-2xl">Coupons</h1>
          <p className="mt-1 text-sm text-slate-500">
            Coupon codes the checkout accepts and the offer cards the shop shows.
          </p>
        </div>
        <Button icon={<Plus size={13} />} onClick={() => setEditing({ id: null, draft: blank() })}>
          New discount
        </Button>
      </header>

      <Card bodyClass="p-0">
        {offers.length === 0 ? (
          <EmptyState title="No discounts yet" hint="Create one and it appears on the offers page." />
        ) : (
          <Table
            head={['Code', 'Title', 'Worth', 'Minimum order', 'Ends', { key: 'a', label: '', align: 'right' }]}
          >
            {offers.map((offer) => (
              <tr key={offer.id} className="hover:bg-slate-50">
                <Td>
                  <span className="font-mono text-xs font-semibold text-slate-900">{offer.code}</span>
                  {offer.featured ? (
                    <Badge tone="indigo" className="ml-2">
                      Featured
                    </Badge>
                  ) : null}
                </Td>
                <Td>
                  <span className="block font-medium text-slate-800">{offer.title}</span>
                  <span className="block text-xs text-slate-500">{offer.subtitle}</span>
                </Td>
                <Td className="font-semibold text-slate-900">
                  {offer.type === 'percentage' ? `${offer.value}%` : formatPrice(offer.value)}
                </Td>
                <Td className="text-slate-600">
                  {offer.minOrder ? formatPrice(offer.minOrder) : 'None'}
                </Td>
                <Td className="whitespace-nowrap text-xs text-slate-500">
                  {(offer.endsAt ?? '').slice(0, 10)}
                </Td>
                <Td align="right">
                  <div className="flex justify-end gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditing({ id: offer.id, draft: fromOffer(offer) })}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      busy={deleting === offer.id}
                      onClick={() => remove(offer)}
                      icon={<Trash2 size={12} />}
                      aria-label={`Delete ${offer.code}`}
                    />
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Drawer
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Edit discount' : 'New discount'}
        subtitle={editing?.id ? editing.draft.code : 'Appears on the offers page once saved'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button variant="accent" busy={saving} onClick={save}>
              Save
            </Button>
          </>
        }
      >
        {editing ? (
          <div className="space-y-5">
            <Card title="The code" bodyClass="space-y-4 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Coupon code" required hint="Capitals and digits">
                  <Input
                    value={editing.draft.code}
                    onChange={set('code')}
                    placeholder="DIWALI75"
                    className="font-mono uppercase"
                  />
                </Field>
                <Field label="Badge" hint="Small label on the card">
                  <Input value={editing.draft.badge} onChange={set('badge')} placeholder="Always on" />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Type" required>
                  <Select value={editing.draft.type} onChange={set('type')}>
                    <option value="percentage">Percentage off</option>
                    <option value="flat">Flat amount off</option>
                  </Select>
                </Field>
                <Field
                  label={editing.draft.type === 'percentage' ? 'Percent off' : 'Amount off (₹)'}
                  required
                >
                  <Input type="number" min="0" value={editing.draft.value} onChange={setNumber('value')} />
                </Field>
                <Field label="Minimum order (₹)">
                  <Input
                    type="number"
                    min="0"
                    value={editing.draft.minOrder}
                    onChange={setNumber('minOrder')}
                  />
                </Field>
              </div>
            </Card>

            <Card title="How it reads" bodyClass="space-y-4 p-4">
              <Field label="Title" required>
                <Input value={editing.draft.title} onChange={set('title')} placeholder="Flat 75% off everything" />
              </Field>
              <Field label="Subtitle">
                <Input value={editing.draft.subtitle} onChange={set('subtitle')} />
              </Field>
              <Field label="Description" required>
                <Textarea value={editing.draft.description} onChange={set('description')} rows={3} />
              </Field>
              <Field label="Terms" hint="One per line">
                <LinesInput
                  value={editing.draft.terms}
                  onChange={(terms) => setEditing((p) => ({ ...p, draft: { ...p.draft, terms } }))}
                  rows={3}
                />
              </Field>
            </Card>

            <Card title="Look and timing" bodyClass="space-y-4 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tone" hint="Paints the card">
                  <Select value={editing.draft.tone} onChange={set('tone')}>
                    {ACCENT_KEYS.map((tone) => (
                      <option key={tone} value={tone}>
                        {tone}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Artwork">
                  <Select value={editing.draft.art} onChange={set('art')}>
                    {ART_TYPES.map((art) => (
                      <option key={art} value={art}>
                        {art}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Ends on" required>
                  <Input type="date" value={editing.draft.endsAt} onChange={set('endsAt')} />
                </Field>
                <Field
                  label="Fallback hours"
                  hint="Countdown rolls forward by this once the date passes"
                >
                  <Input
                    type="number"
                    min="1"
                    value={editing.draft.fallbackHours}
                    onChange={setNumber('fallbackHours')}
                  />
                </Field>
              </div>

              <Toggle
                checked={editing.draft.featured}
                onChange={(featured) => setEditing((p) => ({ ...p, draft: { ...p.draft, featured } }))}
                label="Feature this offer"
                hint="Shows on the home page and the product page"
              />
            </Card>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
};

export default Discounts;
