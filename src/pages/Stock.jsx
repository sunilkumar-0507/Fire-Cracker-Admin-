import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';
import { products as allProducts, categoriesWithCounts } from '@/lib/catalog';
import ProductThumb from '@/components/ProductThumb';
import { Badge, Button, Card, EmptyState, Input, Select, Table, Td } from '@/ui';
import { Search } from '@/components/icons';

/**
 * Stock take.
 *
 * A whole-catalogue edit in one screen: type over the numbers, then save the
 * lot in a single request. Only the rows that actually changed are sent, so a
 * stock take of three items does not rewrite 177 records.
 *
 * The shop reads `stock` for the "Only 4 left" band and to cap what a customer
 * can add to the basket, so zero here really does take an item off sale.
 */
export const Stock = () => {
  const { reload } = useOutletContext();
  const [edits, setEdits] = useState({});
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [saving, setSaving] = useState(false);

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return allProducts.filter((p) => {
      if (term && !p.name.toLowerCase().includes(term) && p.code !== term) return false;
      if (filter === 'out') return p.stock === 0;
      if (filter === 'low') return p.stock > 0 && p.stock <= 20;
      if (filter !== 'all') return p.category === filter;
      return true;
    });
  }, [query, filter]);

  const changed = useMemo(
    () =>
      Object.entries(edits)
        .filter(([id, value]) => {
          const product = allProducts.find((p) => p.id === id);
          return product && value !== '' && Number(value) !== product.stock;
        })
        .map(([id, value]) => ({ id, stock: Number(value) })),
    [edits],
  );

  const save = async () => {
    setSaving(true);
    try {
      const result = await adminApi.stock.save(changed);
      await reload();
      setEdits({});

      toast.success(
        `${result.updated} product${result.updated === 1 ? '' : 's'} updated` +
          (result.unknown.length ? ` · ${result.unknown.length} unknown id skipped` : ''),
      );
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-900">Stock</h1>
          <p className="mt-1 text-sm text-slate-500">
            Set a level to 0 and the shop marks it out of stock.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products"
              className="w-56 pl-8"
            />
          </div>

          <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-48">
            <option value="all">Everything</option>
            <option value="out">Out of stock</option>
            <option value="low">Running low (≤20)</option>
            {categoriesWithCounts.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      </header>

      {changed.length > 0 ? (
        <div className="sticky top-16 z-30 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 shadow-sm">
          <p className="text-sm text-teal-900">
            <strong>{changed.length}</strong> level{changed.length === 1 ? '' : 's'} changed and not
            saved yet.
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEdits({})}>
              Discard
            </Button>
            <Button variant="accent" size="sm" busy={saving} onClick={save}>
              Save stock take
            </Button>
          </div>
        </div>
      ) : null}

      <Card bodyClass="p-0">
        {rows.length === 0 ? (
          <EmptyState title="Nothing matched" hint="Try a different search or filter." />
        ) : (
          <Table
            head={[
              'Product',
              'Category',
              { key: 'c', label: 'On the shop', align: 'right' },
              { key: 'n', label: 'New level', align: 'right' },
            ]}
          >
            {rows.map((product) => {
              const value = edits[product.id] ?? '';
              const dirty = value !== '' && Number(value) !== product.stock;

              return (
                <tr key={product.id} className={dirty ? 'bg-teal-50/60' : 'hover:bg-slate-50'}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <ProductThumb
                        source={product.images[0]}
                        className="h-9 w-9 shrink-0 rounded-lg border border-slate-200"
                      />
                      <div className="min-w-0">
                        <span className="block truncate font-medium text-slate-800">
                          {product.name}
                        </span>
                        <span className="block text-xs text-slate-500">#{product.code}</span>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-xs text-slate-600">{product.category}</Td>
                  <Td align="right">
                    <Badge
                      tone={product.stock === 0 ? 'rose' : product.stock <= 20 ? 'amber' : 'neutral'}
                    >
                      {product.stock === 0 ? 'Out of stock' : product.stock}
                    </Badge>
                  </Td>
                  <Td align="right">
                    <Input
                      type="number"
                      min="0"
                      value={value}
                      placeholder={String(product.stock)}
                      onChange={(e) =>
                        setEdits((prev) => ({ ...prev, [product.id]: e.target.value }))
                      }
                      className="ml-auto w-24 text-right"
                    />
                  </Td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>
    </div>
  );
};

export default Stock;
