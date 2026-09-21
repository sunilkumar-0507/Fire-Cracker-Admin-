import { Bolt, Flame, Gift, Rocket, Smiley, Sparkles, Spinner } from '@/components/icons';
import { cn } from '@/utils/cn';
import { resolveImage } from '@/utils/image';

/**
 * A product's photo, or the glyph that stands in when we do not ship one.
 *
 * The admin used to render `resolveImage(key).src` straight into an `<img>`.
 * That is `undefined` for anything the photo library does not hold — a row
 * naming a file that has since been removed, say — and an `<img>` with no src
 * draws a broken-image icon. A shopkeeper should see which product has no
 * picture, not a browser error glyph, so the fallback is explicit.
 */
const BY_ART = {
  sparkler: Sparkles,
  flowerpot: Flame,
  chakkar: Spinner,
  rocket: Rocket,
  aerial: Rocket,
  bomb: Bolt,
  kids: Smiley,
  giftbox: Gift,
};

export const ProductThumb = ({ source, alt = '', className, loading = 'lazy' }) => {
  const resolved = resolveImage(source);

  if (resolved.kind === 'url') {
    return (
      <img
        src={resolved.src}
        alt={alt}
        loading={loading}
        className={cn('bg-white object-contain', className)}
      />
    );
  }

  const Glyph = BY_ART[resolved.type] ?? Sparkles;
  return (
    <span
      role="img"
      aria-label={alt || 'No photo'}
      title="No photo for this product"
      className={cn('grid place-items-center bg-slate-100 text-slate-400', className)}
    >
      <Glyph size={18} />
    </span>
  );
};

export default ProductThumb;
