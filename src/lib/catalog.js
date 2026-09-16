/**
 * The catalogue, as the admin sees it.
 *
 * The storefront's equivalent module seeds itself from JSON bundled into the
 * build, so the shop still works with the API stopped. This one deliberately
 * does not: an admin showing a catalogue it cannot write to would be worse
 * than an admin that says the API is down, because every screen here exists to
 * change something.
 *
 * Same trick as the storefront otherwise — `load()` runs once before React
 * mounts and swaps the module's exports. These are ES module *live bindings*,
 * so every importer sees the new arrays on its next render, and no screen
 * needs a loading state for something it can always read synchronously.
 *
 * `reload()` is what a screen calls after a successful write.
 */
import { adminApi } from '@/lib/api';

export let products = [];
export let categories = [];
export let combos = [];
export let offers = [];
export let banners = [];

/**
 * Categories with their product counts, matching the shape the storefront
 * derives. The API already counts them on every snapshot build, so this is
 * only re-deriving the cover photo.
 */
export let categoriesWithCounts = [];

/** Every distinct tag in the catalogue, most used first — the tag picker. */
export let allTags = [];

let bySlug = new Map();
let byId = new Map();

export const findProduct = (slugOrId) => bySlug.get(slugOrId) ?? byId.get(slugOrId) ?? null;

const recompute = () => {
  bySlug = new Map(products.map((p) => [p.slug, p]));
  byId = new Map(products.map((p) => [p.id, p]));

  categoriesWithCounts = categories.map((c) => {
    const inCategory = products.filter((p) => p.category === c.slug);
    const cover = inCategory.find((p) => p.featured) ?? inCategory[0];
    return { ...c, productCount: inCategory.length, cover: cover?.images?.[0] };
  });

  const counts = new Map();
  for (const p of products) for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  allTags = [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
};

const hydrate = (payload) => {
  if (!payload) return;

  products = payload.products ?? [];
  categories = payload.categories ?? [];
  combos = payload.combos ?? [];
  offers = payload.offers ?? [];
  banners = payload.banners ?? [];

  recompute();
};

/**
 * Called once before React mounts. A failure is not thrown: the gate renders
 * first and needs to be able to say "the API is not answering" rather than
 * white-screening on an unhandled rejection. The reason is returned so it can.
 */
export const load = async () => {
  try {
    hydrate(await adminApi.bootstrap());
    return { ok: true };
  } catch (error) {
    recompute();
    return { ok: false, reason: error.message };
  }
};

/** Pulls the catalogue again — what a screen calls after it has saved. */
export const reload = async () => {
  hydrate(await adminApi.bootstrap());
};
