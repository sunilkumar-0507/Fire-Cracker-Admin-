import { clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge has to be told about the font sizes this theme adds.
 *
 * It resolves conflicts by class *group*, and it decides which group a `text-*`
 * class belongs to from its own table of known values. `display-sm` and `2xs`
 * are not in that table, so `text-display-sm` was being filed under
 * `text-color` alongside `text-dark` — and since the later class in the string
 * wins, the size was silently dropped.
 *
 * The visible symptom: every heading rendered through `SectionHeading`, which
 * is every section title on the site, came out at the inherited 16px instead
 * of its intended clamp. Registering the sizes here puts them in `font-size`,
 * where they no longer collide with a colour.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['2xs', 'display-sm', 'display-md', 'display-lg'] }],
    },
  },
});

/** Conditional class names with Tailwind conflict resolution. */
export const cn = (...inputs) => twMerge(clsx(inputs));

export default cn;
