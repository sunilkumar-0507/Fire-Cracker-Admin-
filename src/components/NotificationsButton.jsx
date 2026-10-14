import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { cn } from '@/utils/cn';
import { Button } from '@/ui';
import { Bell } from '@/components/icons';
import { disablePush, enablePush, pushState, refreshPush, sendTestPush } from '@/lib/webPush';

const COPY = {
  on: {
    title: 'Notifications are on',
    hint: 'This browser pops up every new order and bulk enquiry, even with the admin closed.',
  },
  off: {
    title: 'Notifications are off',
    hint: 'Turn them on to hear about new orders and bulk enquiries without the app.',
  },
  denied: {
    title: 'Notifications are blocked',
    hint: 'This browser has been told to block them. Allow notifications for this site in its settings, then reload.',
  },
  'needs-home-screen': {
    title: 'Add the admin to your Home Screen',
    hint: 'iPhone only sends notifications to web apps on the Home Screen. Tap Share → Add to Home Screen, open SKV Admin from there, and turn notifications on.',
  },
  unsupported: {
    title: 'Not available in this browser',
    hint: 'Use Chrome, Edge, Firefox or Samsung Internet — or, on iPhone, the admin added to the Home Screen.',
  },
};

/**
 * The header's bell: whether this browser gets order and enquiry
 * notifications, and the switch for it. See `lib/webPush.js`.
 */
export const NotificationsButton = () => {
  const [state, setState] = useState(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const panel = useRef(null);

  useEffect(() => {
    let live = true;
    pushState()
      .then((s) => live && setState(s))
      .catch(() => live && setState('unsupported'));
    refreshPush();
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!panel.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  const run = async (action, success) => {
    setBusy(true);
    try {
      setState(await action());
      if (success) toast.success(success);
    } catch (error) {
      toast.error(error.message);
      setState(await pushState().catch(() => 'unsupported'));
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setBusy(true);
    try {
      await sendTestPush();
      toast.success('Test sent. It should pop up in a few seconds.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  if (!state) return null;
  const copy = COPY[state];

  return (
    <div ref={panel} className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-label={copy.title}
        aria-expanded={open}
        title={copy.title}
        icon={
          <span className="relative">
            <Bell size={14} />
            <span
              className={cn(
                'absolute -right-1 -top-1 h-2 w-2 rounded-full ring-2 ring-white',
                state === 'on' ? 'bg-teal-500' : 'bg-slate-300',
              )}
            />
          </span>
        }
      />

      {open ? (
        <div className="absolute right-0 top-10 z-50 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
          <p className="text-sm font-semibold text-slate-900">{copy.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{copy.hint}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            {state === 'off' ? (
              <Button
                variant="accent"
                size="sm"
                busy={busy}
                onClick={() => run(enablePush, 'Notifications are on for this browser.')}
              >
                Turn on
              </Button>
            ) : null}

            {state === 'on' ? (
              <>
                <Button variant="outline" size="sm" busy={busy} onClick={test}>
                  Send a test
                </Button>
                <Button variant="ghost" size="sm" disabled={busy} onClick={() => run(disablePush)}>
                  Turn off
                </Button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default NotificationsButton;
