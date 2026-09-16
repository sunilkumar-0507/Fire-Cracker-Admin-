/**
 * The demo flags, on their own so that reading them costs nothing.
 *
 * `demoApi.js` pulls in the fixtures — a whole catalogue — and the gate and the
 * banner only need to know whether this is a demo build and what passcode it
 * opens with. Importing those two from here keeps the fixtures out of every
 * bundle that is not actually serving them.
 *
 * Both are build-time constants, so a normal build folds `DEMO` to `false` and
 * drops everything behind it.
 */

export const DEMO =
  import.meta.env.VITE_DEMO_MODE === '1' || import.meta.env.VITE_DEMO_MODE === 'true';

/**
 * The passcode a demo build opens with.
 *
 * In a static demo there is no server to check it, so this string ships inside
 * the bundle and anyone who opens the page can read it out. It gates invented
 * data on a throwaway deployment; it is not a credential, and the real check
 * stays in the API's `AdminOnlyAttribute`.
 */
export const DEMO_PASSCODE = import.meta.env.VITE_DEMO_PASSCODE ?? 'gopi-demo-2026';
