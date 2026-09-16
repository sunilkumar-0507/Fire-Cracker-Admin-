/**
 * Image resolution.
 *
 * Products carry `images: ["GOPI Crackers/ROCKET/Baby Rocket.jfif", ...]` —
 * keys into the real photography shipped from `src/assets`. Anything that is
 * not a known photo falls back to the generated vector art, and an absolute
 * URL (what a real API would send) is passed straight through to an `<img>`.
 */

import { photoUrl } from './productPhotos';

const ART_TYPES = new Set([
  'rocket',
  'flowerpot',
  'sparkler',
  'chakkar',
  'aerial',
  'bomb',
  'kids',
  'giftbox',
]);

const isUrl = (value) => typeof value === 'string' && /^(https?:|data:|\/)/.test(value);

/**
 * @returns {{kind:'url', src:string} | {kind:'art', type:string, variant:number}}
 */
export const resolveImage = (value, fallbackType = 'rocket') => {
  if (isUrl(value)) return { kind: 'url', src: value };

  const photo = photoUrl(value);
  if (photo) return { kind: 'url', src: photo };

  const [type, variant] = String(value ?? '').split('/');
  return {
    kind: 'art',
    type: ART_TYPES.has(type) ? type : fallbackType,
    variant: Number(variant) || 1,
  };
};

/** First image of a product, or a category-appropriate placeholder. */
export const primaryImage = (item, fallbackType = 'rocket') =>
  resolveImage(item?.images?.[0] ?? item?.art, fallbackType);

/** Maps a category slug to the art type used for its illustration. */
export const CATEGORY_ART = {
  sparklers: 'sparkler',
  'flower-pots': 'flowerpot',
  'ground-chakkar': 'chakkar',
  'single-shots': 'rocket',
  'aerial-shots': 'aerial',
  'one-sound-crackers': 'bomb',
  'garland-crackers': 'bomb',
  bombs: 'bomb',
  'kids-zone': 'kids',
  'gift-boxes': 'giftbox',
  'family-packs': 'giftbox',
  'new-arrivals-2026': 'flowerpot',
};

export const artForCategory = (slug) => CATEGORY_ART[slug] ?? 'rocket';
