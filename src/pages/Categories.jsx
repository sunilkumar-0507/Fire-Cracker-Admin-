import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';
import { categoriesWithCounts } from '@/lib/catalog';
import { ACCENTS, ACCENT_KEYS } from '@/constants/accents';
import {
  Badge,
  Button,
  Card,
  Drawer,
  Field,
  Input,
  Select,
  Table,
  Td,
  Textarea,
  Toggle,
} from '@/ui';
import { Plus, Trash2 } from '@/components/icons';
import { ART_TYPES, NOISE_LEVELS } from '@/constants';


const blank = () => ({
  name: '',
  slug: '',
  tamilName: '',
  tagline: '',
  description: '',
  art: 'flowerpot',
  tone: 'amber',
  noiseLevel: 'low',
  featured: false,
});

const fromCategory = (c) => ({
  name: c.name,
  slug: c.slug,
  tamilName: c.tamilName ?? '',
  tagline: c.tagline,
  description: c.description,
  art: c.art,
  tone: c.tone ?? 'amber',
  noiseLevel: c.noiseLevel,
  featured: c.featured,
});

/**
 * Categories.
 *
 * Product counts are not editable — they are counted from the catalogue every
 * time it loads, so a category cannot claim a number its products do not back.
 * The API also refuses to delete or re-slug a category that still holds
 * products, which is why those buttons can fail with a message worth reading.
 */
export const Categories = () => {
  const { reload } = useOutletContext();
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState('');

  const set = (key) => (event) =>
    setEditing((prev) => ({ ...prev, draft: { ...prev.draft, [key]: event.target.value } }));

  const save = async () => {
    setSaving(true);
    try {
      const body = { ...editing.draft, slug: editing.draft.slug || undefined };
      if (editing.id) await adminApi.categories.update(editing.id, body);
      else await adminApi.categories.create(body);

      await reload();
      toast.success(editing.id ? 'Category saved' : 'Category created');
      setEditing(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (category) => {
    if (!window.confirm(`Delete ${category.name}?`)) return;

    setDeleting(category.id);
    try {
      await adminApi.categories.remove(category.id);
      await reload();
      toast.success(`${category.name} deleted`);
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
          <h1 className="font-display text-2xl font-semibold text-slate-900">Categories</h1>
          <p className="mt-1 text-sm text-slate-500">
            The {categoriesWithCounts.length} groups the shop files everything under.
          </p>
        </div>
        <Button icon={<Plus size={13} />} onClick={() => setEditing({ id: null, draft: blank() })}>
          New category
        </Button>
      </header>

      <Card bodyClass="p-0">
        <Table
          head={['Category', 'Slug', 'Tone', 'Noise', { key: 'p', label: 'Products', align: 'right' }, { key: 'a', label: '', align: 'right' }]}
        >
          {categoriesWithCounts.map((category) => (
            <tr key={category.id} className="hover:bg-slate-50">
              <Td>
                <div className="flex items-center gap-3">
                  <span
                    className="h-8 w-8 shrink-0 rounded-lg"
                    style={{ background: category.accent }}
                  />
                  <div className="min-w-0">
                    <span className="block font-medium text-slate-800">
                      {category.name}
                      {category.featured ? (
                        <Badge tone="indigo" className="ml-2">
                          Featured
                        </Badge>
                      ) : null}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {category.tamilName} · {category.tagline}
                    </span>
                  </div>
                </div>
              </Td>
              <Td className="font-mono text-xs text-slate-600">{category.slug}</Td>
              <Td className="text-xs text-slate-600">{category.tone}</Td>
              <Td className="text-xs text-slate-600">{category.noiseLevel}</Td>
              <Td align="right" className="font-semibold text-slate-900">
                {category.productCount}
              </Td>
              <Td align="right">
                <div className="flex justify-end gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditing({ id: category.id, draft: fromCategory(category) })}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    busy={deleting === category.id}
                    disabled={category.productCount > 0}
                    title={
                      category.productCount > 0
                        ? 'Move its products elsewhere first'
                        : `Delete ${category.name}`
                    }
                    onClick={() => remove(category)}
                    icon={<Trash2 size={12} />}
                    aria-label={`Delete ${category.name}`}
                  />
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      </Card>

      <Drawer
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Edit category' : 'New category'}
        subtitle={editing?.id ? editing.draft.name : undefined}
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
            <Card bodyClass="space-y-4 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name" required>
                  <Input value={editing.draft.name} onChange={set('name')} placeholder="Flower Pots" />
                </Field>
                <Field label="Tamil name">
                  <Input
                    value={editing.draft.tamilName}
                    onChange={set('tamilName')}
                    placeholder="புஸ்வாணம்"
                  />
                </Field>
              </div>

              <Field
                label="Slug"
                hint={editing.id ? 'Cannot change while it holds products' : 'Built from the name if blank'}
              >
                <Input value={editing.draft.slug} onChange={set('slug')} placeholder="flower-pots" />
              </Field>

              <Field label="Tagline" required hint="One short line on the card">
                <Input
                  value={editing.draft.tagline}
                  onChange={set('tagline')}
                  placeholder="Fountains of golden rain"
                />
              </Field>

              <Field label="Description" required>
                <Textarea value={editing.draft.description} onChange={set('description')} rows={4} />
              </Field>
            </Card>

            <Card title="Look" bodyClass="space-y-4 p-4">
              <Field label="Tone" hint="Paints the tile, subtitle and CTA">
                <Select value={editing.draft.tone} onChange={set('tone')}>
                  {ACCENT_KEYS.map((tone) => (
                    <option key={tone} value={tone}>
                      {ACCENTS[tone].label}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="flex items-center gap-2">
                {ACCENT_KEYS.map((tone) => (
                  <button
                    key={tone}
                    type="button"
                    aria-label={tone}
                    onClick={() =>
                      setEditing((p) => ({ ...p, draft: { ...p.draft, tone } }))
                    }
                    style={{ background: ACCENTS[tone].hex }}
                    className={
                      editing.draft.tone === tone
                        ? 'h-9 w-9 rounded-lg ring-2 ring-slate-900 ring-offset-2'
                        : 'h-9 w-9 rounded-lg'
                    }
                  />
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Artwork" hint="Vector fallback when a photo is missing">
                  <Select value={editing.draft.art} onChange={set('art')}>
                    {ART_TYPES.map((art) => (
                      <option key={art} value={art}>
                        {art}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Noise level">
                  <Select value={editing.draft.noiseLevel} onChange={set('noiseLevel')}>
                    {NOISE_LEVELS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <Toggle
                checked={editing.draft.featured}
                onChange={(featured) => setEditing((p) => ({ ...p, draft: { ...p.draft, featured } }))}
                label="Feature on the home page"
                hint="Shows in the category grid"
              />
            </Card>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
};

export default Categories;
