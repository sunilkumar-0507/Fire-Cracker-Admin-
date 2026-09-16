/**
 * The admin's own Tailwind build.
 *
 * Deliberately close to stock: slate, teal and the default type scale. The
 * storefront has an elaborate festival theme — warm cream, Playfair display
 * type, custom shadows — and none of it is imported here.
 *
 * That is the point rather than an oversight. Two tabs open on the same
 * machine should never be confused for one another, and the surest way to
 * guarantee that is for the admin to look like a tool and the shop to look
 * like a shop. It also means a change to the storefront's palette can never
 * silently restyle the order book.
 *
 * @type {import('tailwindcss').Config}
 */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        // No web font is loaded. The admin is used by two or three people on
        // the same machines every day; a 40KB font download to make a table of
        // numbers look nicer is not a trade worth making.
        display: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
