/**
 * The real Gopi Crackers product photography.
 *
 * The library lives in this repository, under `src/assets`. In the monorepo
 * this file globs the storefront's copy instead, one folder up and across —
 * there, one library serves both applications and a second copy would drift.
 * A standalone admin has no storefront to borrow from, so it carries its own;
 * the two differ by this path and nothing else.
 *
 * `import.meta.glob` takes a literal pattern, so this cannot go through the
 * `@` alias — Vite resolves aliases in imports, not inside glob patterns.
 */
const files = import.meta.glob(
  '../assets/GOPI Crackers/**/*.{jfif,jpg,jpeg,png,webp}',
  {
    eager: true,
    // `no-inline` keeps small files out of the JS bundle. Vite would otherwise
    // base64 them as `application/octet-stream` — it has no MIME for `.jfif` —
    // and a browser will not render that in an `<img>`.
    query: '?no-inline',
    import: 'default',
  },
);

/** `"GOPI Crackers/BOMB/Classic Bomb.jfif"` → the built asset URL. */
export const PRODUCT_PHOTOS = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [path.replace('../assets/', ''), url]),
);

/** The built URL for a catalogue photo key, or `undefined` if we don't ship it. */
export const photoUrl = (key) =>
  typeof key === 'string' ? PRODUCT_PHOTOS[key] : undefined;
