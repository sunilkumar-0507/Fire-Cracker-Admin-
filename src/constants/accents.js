/**
 * The accent vocabulary.
 *
 * Categories and combo packs each carry a `tone` key; everything that needs to
 * paint in that tone — the icon tile on a card, its subtitle, its CTA pill, the
 * name in the category strip — reads its classes from here. Five tones, so a
 * grid of cards is scannable by colour and not only by label.
 *
 * Every `fill` below pairs with `text-dark`, and every pairing clears WCAG AA
 * for normal text on the card background:
 *
 *   amber  #FFB238  9.68:1     mint   #22C9AE  8.32:1
 *   ember  #E67A00  5.93:1     berry  #F5567F  5.41:1
 *                              royal  #C273F5  5.86:1
 *
 * White on a saturated fill is what fails here — #DD2476 measures 4.58:1 and
 * #A352DD only 4.37:1 — so the bright shade with dark text is the pairing that
 * stays both colourful and legible. The `text` shades below are the deep end of
 * each ramp, measured against the card (#FFFBF4) rather than pure white.
 *
 * Class strings are written out in full. Tailwind scans source text, so a
 * constructed name like `bg-${tone}-400` would be purged from the build.
 */
export const ACCENTS = {
  amber: {
    key: 'amber',
    label: 'Amber',
    hex: '#FFB238',
    soft: '#FFF1D6',
    /** Rounded icon tile at the top-left of a card. */
    tile: 'bg-gradient-to-br from-secondary-300 to-secondary-500 text-dark',
    /** Coloured bloom under the tile — the reference's lit-from-below look. */
    glow: 'shadow-[0_12px_20px_-12px_rgba(255,178,56,.9)]',
    /** Card subtitle and any inline accent text. */
    text: 'text-primary-700',
    /** Small filled pill: discount flags, "MOST LOVED". */
    pill: 'bg-secondary-100 text-primary-800',
    /** Full-width CTA on a card. */
    button: 'bg-secondary-500 text-dark hover:bg-secondary-400',
    /** Border the card picks up on hover. */
    ring: 'hover:border-secondary-300',
    /** Tinted panel behind a contents list. */
    wash: 'bg-secondary-50',
    /** Same hue, but picked to clear AA against the dark band (#2B1408). */
    onDark: 'text-secondary-500',
  },
  ember: {
    key: 'ember',
    label: 'Ember',
    hex: '#E67A00',
    soft: '#FFE7C6',
    tile: 'bg-gradient-to-br from-primary-300 to-primary-500 text-dark',
    glow: 'shadow-[0_12px_20px_-12px_rgba(230,122,0,.9)]',
    text: 'text-primary-800',
    pill: 'bg-primary-100 text-primary-800',
    button: 'bg-primary-500 text-dark hover:bg-primary-400',
    ring: 'hover:border-primary-300',
    wash: 'bg-primary-50',
    onDark: 'text-primary-500',
  },
  mint: {
    key: 'mint',
    label: 'Mint',
    hex: '#22C9AE',
    soft: '#E4FBF6',
    tile: 'bg-gradient-to-br from-mint-300 to-mint-500 text-dark',
    glow: 'shadow-[0_12px_20px_-12px_rgba(34,201,174,.9)]',
    text: 'text-mint-800',
    pill: 'bg-mint-100 text-mint-800',
    button: 'bg-mint-400 text-dark hover:bg-mint-300',
    ring: 'hover:border-mint-300',
    wash: 'bg-mint-100/60',
    onDark: 'text-mint-400',
  },
  berry: {
    key: 'berry',
    label: 'Berry',
    hex: '#F5567F',
    soft: '#FFEAF1',
    tile: 'bg-gradient-to-br from-berry-300 to-berry-500 text-dark',
    glow: 'shadow-[0_12px_20px_-12px_rgba(245,86,127,.9)]',
    text: 'text-berry-700',
    pill: 'bg-berry-100 text-berry-700',
    button: 'bg-berry-400 text-dark hover:bg-berry-300',
    ring: 'hover:border-berry-300',
    wash: 'bg-berry-100/60',
    onDark: 'text-berry-400',
  },
  royal: {
    key: 'royal',
    label: 'Royal',
    hex: '#C273F5',
    soft: '#F6EAFF',
    tile: 'bg-gradient-to-br from-royal-300 to-royal-500 text-dark',
    glow: 'shadow-[0_12px_20px_-12px_rgba(194,115,245,.9)]',
    text: 'text-royal-700',
    pill: 'bg-royal-100 text-royal-700',
    button: 'bg-royal-400 text-dark hover:bg-royal-300',
    ring: 'hover:border-royal-300',
    wash: 'bg-royal-100/60',
    onDark: 'text-royal-400',
  },
};

export const ACCENT_KEYS = Object.keys(ACCENTS);

/** Resolve a tone key, falling back to amber for anything unrecognised. */
export const accentOf = (tone) => ACCENTS[tone] ?? ACCENTS.amber;

/** Deterministic tone for a list position — used where data carries no tone. */
export const accentAt = (index) => ACCENTS[ACCENT_KEYS[index % ACCENT_KEYS.length]];
