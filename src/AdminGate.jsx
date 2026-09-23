import { useEffect, useState } from 'react';
import { adminApi, adminPasscode } from '@/lib/api';
import { Button, Field, Input } from '@/ui';
import { Lock } from '@/components/icons';

/**
 * The passcode screen.
 *
 * It does not decide anything on its own — it asks the API. A passcode is
 * "correct" only because `GET /api/admin/summary` accepted it, so there is no
 * client-side check to bypass and nothing useful cached in the browser. The
 * passcode itself lives in `sessionStorage` and dies with the tab.
 *
 * This is a shared passcode, sent in plain text, with no accounts and no rate
 * limiting. It keeps the admin out of casual reach on a shop's own network. It
 * is not authentication, and the API says so too — see AdminOnlyAttribute.
 */
export const AdminGate = ({ children }) => {
  const [status, setStatus] = useState('checking');
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  // A passcode already in sessionStorage is verified rather than trusted, so a
  // stale one from before a passcode change re-prompts instead of 401-ing on
  // whatever the first screen happens to load.
  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (!adminPasscode.get()) {
        if (!cancelled) setStatus('locked');
        return;
      }
      try {
        await adminApi.verify();
        if (!cancelled) setStatus('open');
      } catch {
        adminPasscode.clear();
        if (!cancelled) setStatus('locked');
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setStatus('submitting');
    setError('');
    adminPasscode.set(value.trim());

    try {
      await adminApi.verify();
      setStatus('open');
    } catch (err) {
      adminPasscode.clear();
      setStatus('locked');
      setError(
        err.status === 401
          ? 'That passcode was not accepted.'
          : err.message,
      );
    }
  };

  if (status === 'open') return children;

  return (
    <div className="grid min-h-screen place-items-center bg-slate-900 px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-2xl"
      >
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-teal-500/15 text-teal-300">
          <Lock size={18} />
        </span>

        <h1 className="mt-4 text-lg font-semibold text-white">SKV Pyros admin</h1>
        <p className="mt-1 text-sm text-slate-400">
          Enter the shop passcode to manage products, discounts and orders.
        </p>

        <div className="mt-5">
          <Field label={<span className="text-slate-300">Passcode</span>} error={error}>
            <Input
              type="password"
              value={value}
              autoFocus
              autoComplete="current-password"
              disabled={status === 'checking' || status === 'submitting'}
              onChange={(e) => {
                setValue(e.target.value);
                setError('');
              }}
              error={error}
              className="border-slate-600 bg-slate-900 text-white placeholder:text-slate-500"
              placeholder="••••••••"
            />
          </Field>
        </div>

        <Button
          type="submit"
          variant="accent"
          className="mt-4 w-full"
          busy={status === 'submitting' || status === 'checking'}
          disabled={!value.trim()}
        >
          Unlock
        </Button>

        <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
          One shared passcode, sent in plain text, with no accounts or audit trail.
          Fine on the shop’s own network — put real authentication in front of this
          before exposing it to the internet.
        </p>
      </form>
    </div>
  );
};

export default AdminGate;
