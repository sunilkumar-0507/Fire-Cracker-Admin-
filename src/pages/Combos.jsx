import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';
import { combos, products as allProducts, findProduct } from '@/lib/catalog';
import { formatPrice } from '@/utils/format';
import ProductThumb from '@/components/ProductThumb';
import { ACCENT_KEYS } from '@/constants/accents';
import {
  Badge,
  Button,
  Card,
  Drawer,
  EmptyState,
  Field,
  Input,
  Select,
  Table,
  Td,
  Textarea,
  Toggle,
} from '@/ui';
import { Plus, Search, Trash2 } from '@/components/icons';
import { ART_TYPES } from '@/constants';


const blank = () => ({
  name: '',
  slug: '',
  tagline: '',
  description: '',
  art: 'giftbox',
  tone: 'amber',
  serves: '',
  duration: '',
  badge: '',
  stock: 25,
  featured: false,
  bundleDiscount: 10,
  includes: [],
});

/**
 * An existing combo's lines carry a slug only if they were saved through here.
 * The ones seeded from the price-list importer do, but a hand-written line
 * would not, so anything unmatched is dropped rather than sent back as a slug
 * the API would reject.
 */
const fromCombo = (c) => ({
  name: c.name,
  slug: c.slug,
  tagline: c.tagline,
  description: c.description,
  art: c.art,
  tone: c.tone ?? 'amber',
  serves: c.serves ?? '',
  duration: c.duration ?? '',
  badge: c.badge ?? '',
  stock: c.stock ?? 25,
  featured: c.featured,
  bundleDiscount: 10,
  includes: (c.includes ?? [])
    .filter((line) => line.slug && findProduct(line.slug))
    .map((line) => ({ slug: line.slug, qty: line.qty })),
});

/* -------------------------------------------------------------------------- */
/* Line builder                                                                */
/* -------------------------------------------------------------------------- */

const LineBuilder = ({ includes, onChange, bundleDiscount }) => {
  const [query, setQuery] = useState('');

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return allProducts
      .filter((p) => p.name.toLowerCase().includes(term) && !includes.some((l) => l.slug === p.slug))
      .slice(0, 8);
  }, [query, includes]);

  const lines = includes
    .map((line) => ({ ...line, product: findProduct(line.slug) }))
    .filter((line) => line.product);

  const parts = lines.reduce((sum, l) => sum + l.product.price * l.qty, 0);
  const mrp = lines.reduce((sum, l) => sum + l.product.mrp * l.qty, 0);
  const price = Math.round(parts * (1 - bundleDiscount / 100));
  const count = lines.reduce((sum, l) => sum + l.qty, 0);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the catalogue to add an item"
          className="pl-8"
        />
        {matches.length > 0 ? (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
            {matches.map((product) => (
              <li key={product.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange([...includes, { slug: product.slug, qty: 1 }]);
                    setQuery('');
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                >
                  <ProductThumb
                    source={product.images[0]}
                    className="h-7 w-7 rounded border border-slate-200"
                  />
                  <span className="min-w-0 flex-1 truncate text-slate-800">{product.name}</span>
                  <span className="shrink-0 text-xs text-slate-500">{formatPrice(product.price)}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {lines.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-3 text-xs text-slate-500">
          Nothing in the bundle yet. Search above to add the first item.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {lines.map((line) => (
            <li key={line.slug} className="flex items-center gap-3 px-3 py-2">
              <ProductThumb
                source={line.product.images[0]}
                className="h-9 w-9 shrink-0 rounded border border-slate-200"
              />
              <div className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-800">
                  {line.product.name}
                </span>
                <span className="block text-xs text-slate-500">
                  {formatPrice(line.product.price)} each
                </span>
              </div>
              <Input
                type="number"
                min="1"
                value={line.qty}
                onChange={(e) =>
                  onChange(
                    includes.map((l) =>
                      l.slug === line.slug ? { ...l, qty: Math.max(1, Number(e.target.value) || 1) } : l,
                    ),
                  )
                }
                className="w-20 text-right"
              />
              <Button
                size="sm"
                variant="danger"
                aria-label={`Remove ${line.product.name}`}
                onClick={() => onChange(includes.filter((l) => l.slug !== line.slug))}
                icon={<Trash2 size={12} />}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-lg bg-slate-100 p-3 text-xs text-slate-600">
        <p className="font-semibold text-slate-800">
          {count} pack{count === 1 ? '' : 's'} · sells for {formatPrice(price)}
        </p>
        <p className="mt-1">
          Parts come to {formatPrice(parts)} at catalogue prices, {formatPrice(mrp)} at MRP. The
          bundle discount takes {bundleDiscount}% off the parts, so the card will read{' '}
          <strong className="text-slate-800">
            {mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0}% off
          </strong>
          . The API recalculates all of this on save — these numbers are a preview, not the input.
        </p>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Screen                                                                      */
/* -------------------------------------------------------------------------- */

export const Combos = () => {
  const { reload } = useOutletContext();
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState('');

  const set = (key) => (event) =>
    setEditing((prev) => ({ ...prev, draft: { ...prev.draft, [key]: event.target.value } }));

  const setNumber = (key) => (event) =>
    setEditing((prev) => ({
      ...prev,
      draft: { ...prev.draft, [key]: event.target.value === '' ? '' : Number(event.target.value) },
    }));

  const save = async () => {
    setSaving(true);
    try {
      const body = { ...editing.draft, slug: editing.draft.slug || undefined };
      if (editing.id) await adminApi.combos.update(editing.id, body);
      else await adminApi.combos.create(body);

      await reload();
      toast.success(editing.id ? 'Combo saved' : 'Combo created');
      setEditing(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (combo) => {
    if (!window.confirm(`Delete ${combo.name}?`)) return;

    setDeleting(combo.id);
    try {
      await adminApi.combos.remove(combo.id);
      await reload();
      toast.success(`${combo.name} deleted`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting('');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-900">Combo packs</h1>
          <p className="mt-1 text-sm text-slate-500">
            Bundles priced from their contents — pick the items, the money follows.
          </p>
        </div>
        <Button icon={<Plus size={13} />} onClick={() => setEditing({ id: null, draft: blank() })}>
          New combo
        </Button>
      </header>

      <Card bodyClass="p-0">
        {combos.length === 0 ? (
          <EmptyState title="No combo packs yet" />
        ) : (
          <Table
            head={[
              'Combo',
              { key: 'i', label: 'Items', align: 'right' },
              { key: 'p', label: 'Price', align: 'right' },
              { key: 'd', label: 'Discount', align: 'right' },
              { key: 'a', label: '', align: 'right' },
            ]}
          >
            {combos.map((combo) => (
              <tr key={combo.id} className="hover:bg-slate-50">
                <Td>
                  <span className="block font-medium text-slate-800">
                    {combo.name}
                    {combo.featured ? (
                      <Badge tone="indigo" className="ml-2">
                        Featured
                      </Badge>
                    ) : null}
                  </span>
                  <span className="block text-xs text-slate-500">{combo.tagline}</span>
                </Td>
                <Td align="right" className="text-slate-700">
                  {combo.itemCount}
                </Td>
                <Td align="right">
                  <span className="block font-semibold text-slate-900">
                    {formatPrice(combo.price)}
                  </span>
                  <span className="block text-xs text-slate-400 line-through">
                    {formatPrice(combo.mrp)}
                  </span>
                </Td>
                <Td align="right">
                  <Badge tone="teal">{combo.discount}% off</Badge>
                </Td>
                <Td align="right">
                  <div className="flex justify-end gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditing({ id: combo.id, draft: fromCombo(combo) })}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      busy={deleting === combo.id}
                      onClick={() => remove(combo)}
                      icon={<Trash2 size={12} />}
                      aria-label={`Delete ${combo.name}`}
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
        wide
        title={editing?.id ? 'Edit combo pack' : 'New combo pack'}
        subtitle={editing?.id ? editing.draft.name : 'Pricing is derived from what you put in it'}
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
            {editing.id && editing.draft.includes.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                This bundle’s contents were written by hand and are not linked to catalogue items,
                so they could not be loaded. Add the items again below — saving replaces the old
                list and starts pricing it from the catalogue.
              </div>
            ) : null}

            <Card title="What is in it" bodyClass="p-4">
              <LineBuilder
                includes={editing.draft.includes}
                bundleDiscount={editing.draft.bundleDiscount || 0}
                onChange={(includes) => setEditing((p) => ({ ...p, draft: { ...p.draft, includes } }))}
              />
            </Card>

            <Card title="How it reads" bodyClass="space-y-4 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name" required>
                  <Input value={editing.draft.name} onChange={set('name')} placeholder="Family Festival Box" />
                </Field>
                <Field label="Badge" hint="Small label on the card">
                  <Input value={editing.draft.badge} onChange={set('badge')} placeholder="Most popular" />
                </Field>
              </div>

              <Field label="Tagline" required>
                <Input
                  value={editing.draft.tagline}
                  onChange={set('tagline')}
                  placeholder="One evening, one box, everybody covered"
                />
              </Field>

              <Field label="Description" required>
                <Textarea value={editing.draft.description} onChange={set('description')} rows={4} />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Serves" hint="Free text">
                  <Input value={editing.draft.serves} onChange={set('serves')} placeholder="6–8 people" />
                </Field>
                <Field label="Duration">
                  <Input
                    value={editing.draft.duration}
                    onChange={set('duration')}
                    placeholder="About 90 minutes"
                  />
                </Field>
              </div>
            </Card>

            <Card title="Pricing and look" bodyClass="space-y-4 p-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Bundle discount (%)" hint="Off the sum of the parts">
                  <Input
                    type="number"
                    min="0"
                    max="60"
                    value={editing.draft.bundleDiscount}
                    onChange={setNumber('bundleDiscount')}
                  />
                </Field>
                <Field label="Stock">
                  <Input type="number" min="0" value={editing.draft.stock} onChange={setNumber('stock')} />
                </Field>
                <Field label="Tone">
                  <Select value={editing.draft.tone} onChange={set('tone')}>
                    {ACCENT_KEYS.map((tone) => (
                      <option key={tone} value={tone}>
                        {tone}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Artwork">
                  <Select value={editing.draft.art} onChange={set('art')}>
                    {ART_TYPES.map((art) => (
                      <option key={art} value={art}>
                        {art}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Toggle
                  checked={editing.draft.featured}
                  onChange={(featured) =>
                    setEditing((p) => ({ ...p, draft: { ...p.draft, featured } }))
                  }
                  label="Feature it"
                  hint="Shows on the home page"
                />
              </div>
            </Card>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
};

export default Combos;
