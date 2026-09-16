/**
 * The real Gopi Crackers product photography.
 *
 * This repository carries its own copy of the library. In the combined
 * repository the glob reached across into the storefront's `src/assets` so
 * that one set of 177 photographs served both applications; split into two
 * repositories there is nothing to reach into, and a copy is the only way the
 * photo picker has anything to show. Adding photography is now two commits,
 * and the two copies can drift — keep them in step deliberately.
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
