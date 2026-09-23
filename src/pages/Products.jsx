import { useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';
import { products as allProducts, categoriesWithCounts, allTags } from '@/lib/catalog';
import { formatPrice } from '@/utils/format';
import { PRODUCT_PHOTOS } from '@/utils/productPhotos';
import { preparePhoto } from '@/utils/photoUpload';
import ProductThumb from '@/components/ProductThumb';
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
import { Download, Plus, Search, Trash2 } from '@/components/icons';
import { AVAILABILITY_LABEL, AVAILABILITY_TONE } from '@/constants';

/** Every photo the build ships, for the image picker. */
const PHOTO_KEYS = Object.keys(PRODUCT_PHOTOS).sort();

const blank = (category) => ({
  name: '',
  slug: '',
  category,
  brand: 'Gopi Crackers',
  price: 0,
  mrp: 0,
  unit: '',
  description: '',
  highlights: [],
  images: [],
  stock: 0,
  tags: [],
  specs: {},
  featured: false,
  bestSeller: false,
  isNew: false,
  active: true,
});

const fromProduct = (p) => ({
  name: p.name,
  slug: p.slug,
  category: p.category,
  brand: p.brand,
  price: p.price,
  mrp: p.mrp,
  unit: p.unit,
  description: p.description,
  highlights: [...p.highlights],
  images: [...p.images],
  stock: p.stock,
  tags: [...p.tags],
  specs: { ...p.specs },
  featured: p.featured,
  bestSeller: p.bestSeller,
  isNew: p.isNew,
  // Absent on a product written before the flag existed, and absent has to
  // mean "on sale" — otherwise opening an old row and saving it would
  // silently withdraw the product.
  active: p.active !== false,
});

/* -------------------------------------------------------------------------- */
/* Image picker                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Photos come from two places.
 *
 * The library is what the build already ships: keys into
 * `src/assets/GOPI Crackers`, hashed by the bundler. An upload is a photo from
 * this device — the shop's phone camera, or a file on the computer — stored by
 * the API and referenced by the absolute URL it returns, which both front ends
 * render as-is. Either kind can be first, and the first is the card image.
 */
const ImagePicker = ({ value, onChange }) => {
  const [filter, setFilter] = useState('');
  const [uploading, setUploading] = useState(0);
  const fileInput = useRef(null);

  const upload = async (event) => {
    const files = [...(event.target.files ?? [])];
    // Cleared at once, so choosing the same photo again still fires a change.
    event.target.value = '';
    if (!files.length) return;

    setUploading(files.length);
    const added = [];

    // One at a time: a shop's mobile data is not a place for six parallel
    // uploads, and the order they finish in is the order they were picked.
    for (const file of files) {
      try {
        const { url } = await adminApi.uploads.image(await preparePhoto(file));
        added.push(url);
      } catch (err) {
        toast.error(err.message);
      } finally {
        setUploading((n) => n - 1);
      }
    }

    if (added.length) {
      onChange([...value, ...added]);
      toast.success(added.length === 1 ? 'Photo added' : `${added.length} photos added`);
    }
  };

  const options = useMemo(() => {
    const term = filter.trim().toLowerCase();
    const pool = term ? PHOTO_KEYS.filter((k) => k.toLowerCase().includes(term)) : PHOTO_KEYS;
    return pool.slice(0, 60);
  }, [filter]);

  const toggle = (key) =>
    onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value, key]);

  return (
    <div className="space-y-3">
      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {value.map((key) => (
            <li key={key} className="relative">
              <ProductThumb
                source={key}
                className="h-16 w-16 rounded-lg border border-slate-200"
              />
              <button
                type="button"
                onClick={() => toggle(key)}
                aria-label={`Remove ${key}`}
                className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-rose-600 text-[10px] text-white"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-300 p-3 text-xs text-slate-500">
          No photo chosen yet. A product needs at least one.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          icon={<Download size={12} className="rotate-180" />}
          busy={uploading > 0}
          onClick={() => fileInput.current?.click()}
        >
          {uploading > 0 ? `Uploading ${uploading}…` : 'Upload from device'}
        </Button>
        <span className="text-[11px] text-slate-500">
          JPEG, PNG or WebP. On a phone this offers the camera too.
        </span>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          onChange={upload}
          className="hidden"
        />
      </div>

      <Input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Or pick from the photo library — try “sparkl”, “bomb”, “gift”"
      />

      <ul className="grid max-h-56 grid-cols-4 gap-2 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 sm:grid-cols-6">
        {options.map((key) => {
          const active = value.includes(key);
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => toggle(key)}
                title={key}
                className={
                  active
                    ? 'block w-full rounded-lg border-2 border-teal-500 p-0.5'
                    : 'block w-full rounded-lg border-2 border-transparent p-0.5 hover:border-slate-300'
                }
              >
                <ProductThumb
                  source={key}
                  className="aspect-square w-full rounded"
                />
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] text-slate-500">
        Showing {options.length} of {PHOTO_KEYS.length} photos the build ships. Uploaded photos
        are kept by the API and appear on the shop as soon as the product is saved.
      </p>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Editor                                                                      */
/* -------------------------------------------------------------------------- */

const SpecEditor = ({ value, onChange }) => {
  const rows = Object.entries(value);

  const setRow = (index, key, val) => {
    const next = rows.map((row, i) => (i === index ? [key, val] : row));
    onChange(Object.fromEntries(next.filter(([k]) => k.trim())));
  };

  return (
    <div className="space-y-2">
      {rows.map(([key, val], index) => (
        <div key={index} className="flex gap-2">
          <Input
            value={key}
            onChange={(e) => setRow(index, e.target.value, val)}
            placeholder="Noise"
            className="w-2/5"
          />
          <Input
            value={val}
            onChange={(e) => setRow(index, key, e.target.value)}
            placeholder="Silent"
          />
          <Button
            variant="danger"
            size="sm"
            aria-label="Remove spec"
            onClick={() => onChange(Object.fromEntries(rows.filter((_, i) => i !== index)))}
            icon={<Trash2 size={12} />}
          />
        </div>
      ))}
      <Button size="sm" variant="outline" icon={<Plus size={12} />} onClick={() => onChange({ ...value, '': '' })}>
        Add a spec
      </Button>
    </div>
  );
};

const ProductEditor = ({ draft, setDraft, categories }) => {
  const set = (key) => (event) => setDraft({ ...draft, [key]: event.target.value });
  const setNumber = (key) => (event) =>
    setDraft({ ...draft, [key]: event.target.value === '' ? '' : Number(event.target.value) });

  const discount =
    draft.mrp > 0 && draft.mrp > draft.price
      ? Math.round(((draft.mrp - draft.price) / draft.mrp) * 100)
      : 0;

  return (
    <div className="space-y-5">
      <Card title="What it is" bodyClass="space-y-4 p-4">
        <Field label="Name" required hint="Shown on the card and the product page">
          <Input value={draft.name} onChange={set('name')} placeholder="4″ Gold Lakshmi" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" required>
            <Select value={draft.category} onChange={set('category')}>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Unit" required hint="What a customer gets">
            <Input value={draft.unit} onChange={set('unit')} placeholder="Box of 10" />
          </Field>
        </div>

        <Field
          label="Slug"
          hint="Leave blank to build it from the name"
        >
          <Input value={draft.slug} onChange={set('slug')} placeholder="4-inch-gold-lakshmi" />
        </Field>

        <Field label="Description" required hint="A sentence or two — this is what sells it">
          <Textarea value={draft.description} onChange={set('description')} rows={4} />
        </Field>

        <Field label="Highlights" hint="One per line, three reads best">
          <LinesInput
            value={draft.highlights}
            onChange={(highlights) => setDraft({ ...draft, highlights })}
            placeholder={'Heaviest 4 inch charge in the range\nGold-foiled casing'}
          />
        </Field>
      </Card>

      <Card title="Price and stock" bodyClass="space-y-4 p-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Selling price" required hint="₹">
            <Input type="number" min="1" value={draft.price} onChange={setNumber('price')} />
          </Field>
          <Field label="MRP" required hint="₹">
            <Input type="number" min="1" value={draft.mrp} onChange={setNumber('mrp')} />
          </Field>
          <Field label="Stock">
            <Input type="number" min="0" value={draft.stock} onChange={setNumber('stock')} />
          </Field>
        </div>

        <div className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
          {draft.mrp > 0 && draft.mrp <= draft.price ? (
            <span className="font-medium text-rose-600">
              MRP has to be above the selling price, or the badge will read 0% off.
            </span>
          ) : (
            <>
              Shows as <strong className="text-slate-900">{discount}% off</strong> —{' '}
              {formatPrice(draft.price || 0)} against {formatPrice(draft.mrp || 0)}. The discount is
              worked out on save, never typed.
            </>
          )}
        </div>
      </Card>

      <Card title="Photos" subtitle="First one is the card image" bodyClass="p-4">
        <ImagePicker value={draft.images} onChange={(images) => setDraft({ ...draft, images })} />
      </Card>

      <Card title="How it is filed" bodyClass="space-y-4 p-4">
        <Field label="Tags" hint="One per line — these drive the shop's filters">
          <LinesInput
            value={draft.tags}
            onChange={(tags) => setDraft({ ...draft, tags })}
            rows={3}
            placeholder={'silent\nkids-safe'}
          />
        </Field>

        <details className="rounded-lg border border-slate-200 bg-white p-3">
          <summary className="cursor-pointer text-xs font-semibold text-slate-700">
            Tags already in use ({allTags.length})
          </summary>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {allTags.map(({ tag, count }) => (
              <button
                key={tag}
                type="button"
                onClick={() =>
                  setDraft({
                    ...draft,
                    tags: draft.tags.includes(tag)
                      ? draft.tags.filter((t) => t !== tag)
                      : [...draft.tags, tag],
                  })
                }
                className={
                  draft.tags.includes(tag)
                    ? 'rounded-full bg-teal-600 px-2 py-0.5 text-[11px] font-medium text-white'
                    : 'rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-200'
                }
              >
                {tag} · {count}
              </button>
            ))}
          </div>
        </details>

        <Field label="Specs" hint="Shown as a table on the product page">
          <SpecEditor value={draft.specs} onChange={(specs) => setDraft({ ...draft, specs })} />
        </Field>

        <div className="grid gap-2 sm:grid-cols-3">
          <Toggle
            checked={draft.featured}
            onChange={(featured) => setDraft({ ...draft, featured })}
            label="Featured"
            hint="Can front its category"
          />
          <Toggle
            checked={draft.bestSeller}
            onChange={(bestSeller) => setDraft({ ...draft, bestSeller })}
            label="Best seller"
            hint="Shows on the home row"
          />
          <Toggle
            checked={draft.active}
            onChange={(active) => setDraft({ ...draft, active })}
            label="On sale"
            hint="Turn this off to park the product: it keeps its page and its photos, reads as temporarily unavailable, and cannot be added to a basket."
          />

          <Toggle
            checked={draft.isNew}
            onChange={(isNew) => setDraft({ ...draft, isNew })}
            label="New"
            hint="Carries a New badge"
          />
        </div>
      </Card>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Screen                                                                      */
/* -------------------------------------------------------------------------- */

export const Products = () => {
  const { reload } = useOutletContext();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [editing, setEditing] = useState(null); // { id | null, draft }
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState('');
  const [toggling, setToggling] = useState('');

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return allProducts.filter(
      (p) =>
        (category === 'all' || p.category === category) &&
        (!term ||
          p.name.toLowerCase().includes(term) ||
          p.slug.includes(term) ||
          p.code === term),
    );
  }, [query, category]);

  const save = async () => {
    setSaving(true);
    try {
      const body = { ...editing.draft, slug: editing.draft.slug || undefined };
      if (editing.id) await adminApi.products.update(editing.id, body);
      else await adminApi.products.create(body);

      await reload();
      toast.success(editing.id ? 'Product saved' : 'Product added');
      setEditing(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Requirement 10's activate / deactivate. Deliberately not a confirm dialog:
   * this is reversible with the same click, unlike delete, and a shopkeeper
   * parking six lines between batches should not have to dismiss six prompts.
   */
  const toggleActive = async (product) => {
    const next = product.active === false;

    setToggling(product.id);
    try {
      await adminApi.products.setActive(product.id, next);
      await reload();
      toast.success(next ? `${product.name} is on sale again` : `${product.name} deactivated`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setToggling('');
    }
  };

  const remove = async (product) => {
    if (!window.confirm(`Delete ${product.name}? This rewrites products.json.`)) return;

    setDeleting(product.id);
    try {
      await adminApi.products.remove(product.id);
      await reload();
      toast.success(`${product.name} deleted`);
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
          <h1 className="font-display text-2xl font-semibold text-slate-900">Products</h1>
          <p className="mt-1 text-sm text-slate-500">
            {allProducts.length} in the catalogue. Saving writes straight to the shop.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, slug or price-list code"
              className="w-60 pl-8"
            />
          </div>

          <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-48">
            <option value="all">All categories</option>
            {categoriesWithCounts.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name} ({c.productCount})
              </option>
            ))}
          </Select>

          <Button
            icon={<Plus size={13} />}
            onClick={() =>
              setEditing({ id: null, draft: blank(categoriesWithCounts[0]?.slug ?? '') })
            }
          >
            Add product
          </Button>
        </div>
      </header>

      <Card bodyClass="p-0">
        {rows.length === 0 ? (
          <EmptyState title="Nothing matched" hint="Try a different search or category." />
        ) : (
          <Table
            head={[
              'Product',
              'Category',
              { key: 'p', label: 'Price', align: 'right' },
              { key: 's', label: 'Stock', align: 'right' },
              'Availability',
              'Flags',
              { key: 'a', label: '', align: 'right' },
            ]}
          >
            {rows.map((product) => (
              <tr key={product.id} className="hover:bg-slate-50">
                <Td>
                  <div className="flex items-center gap-3">
                    <ProductThumb
                      source={product.images[0]}
                      className="h-10 w-10 shrink-0 rounded-lg border border-slate-200"
                    />
                    <div className="min-w-0">
                      <span className="block truncate font-medium text-slate-800">{product.name}</span>
                      <span className="block text-xs text-slate-500">
                        #{product.code} · {product.unit}
                      </span>
                    </div>
                  </div>
                </Td>
                <Td className="text-xs text-slate-600">{product.category}</Td>
                <Td align="right">
                  <span className="block font-semibold text-slate-900">
                    {formatPrice(product.price)}
                  </span>
                  <span className="block text-xs text-slate-400 line-through">
                    {formatPrice(product.mrp)}
                  </span>
                </Td>
                <Td align="right">
                  <Badge tone={product.stock === 0 ? 'rose' : product.stock <= 20 ? 'amber' : 'neutral'}>
                    {product.stock}
                  </Badge>
                </Td>
                <Td>
                  {/* The API derives availability from the two facts beside it,
                      so this badge cannot disagree with the stock column. */}
                  <Badge tone={AVAILABILITY_TONE[product.availability] ?? 'neutral'}>
                    {AVAILABILITY_LABEL[product.availability] ?? product.availability}
                  </Badge>
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {product.featured ? <Badge tone="indigo">Featured</Badge> : null}
                    {product.bestSeller ? <Badge tone="teal">Best</Badge> : null}
                    {product.isNew ? <Badge tone="emerald">New</Badge> : null}
                  </div>
                </Td>
                <Td align="right">
                  <div className="flex justify-end gap-1.5">
                    {/* One click, one request. Going through the edit form to
                        flip this would re-submit every other field with it,
                        and save whatever the form happened to be holding. */}
                    <Button
                      size="sm"
                      variant="outline"
                      busy={toggling === product.id}
                      onClick={() => toggleActive(product)}
                    >
                      {product.active === false ? 'Activate' : 'Deactivate'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditing({ id: product.id, draft: fromProduct(product) })}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      busy={deleting === product.id}
                      onClick={() => remove(product)}
                      icon={<Trash2 size={12} />}
                      aria-label={`Delete ${product.name}`}
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
        title={editing?.id ? 'Edit product' : 'Add a product'}
        subtitle={editing?.id ? editing.draft.name : 'It goes live on the shop as soon as you save'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button variant="accent" busy={saving} onClick={save}>
              {editing?.id ? 'Save changes' : 'Add to catalogue'}
            </Button>
          </>
        }
      >
        {editing ? (
          <ProductEditor
            draft={editing.draft}
            setDraft={(draft) => setEditing((prev) => ({ ...prev, draft }))}
            categories={categoriesWithCounts}
          />
        ) : null}
      </Drawer>
    </div>
  );
};

export default Products;
