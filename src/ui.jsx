/**
 * Admin primitives.
 *
 * The storefront is warm cream and amber — a Diwali shop front. The admin is
 * deliberately the opposite: cool slate, dense rows, flat surfaces, one accent.
 * That contrast is the point. A shopkeeper with both open in two tabs should
 * never have to look at the URL to know which one they are typing into.
 *
 * These are plain components rather than a component library because the whole
 * admin is about twenty screens' worth of forms and tables, and the shop
 * already ships its own set tuned for a completely different look.
 */
import { useEffect, useRef } from 'react';
import { cn } from '@/utils/cn';
import { Check, Spinner, X } from '@/components/icons';

/* -------------------------------------------------------------------------- */
/* Buttons                                                                     */
/* -------------------------------------------------------------------------- */

const VARIANTS = {
  primary: 'bg-slate-900 text-white hover:bg-slate-700 disabled:bg-slate-300',
  accent: 'bg-teal-600 text-white hover:bg-teal-500 disabled:bg-teal-200',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 disabled:text-slate-300',
  outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:text-slate-300',
  danger: 'border border-rose-200 bg-white text-rose-700 hover:bg-rose-50 disabled:text-rose-300',
};

const SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
};

export const Button = ({
  variant = 'primary',
  size = 'md',
  busy = false,
  icon,
  className,
  children,
  ...rest
}) => (
  <button
    type="button"
    {...rest}
    disabled={rest.disabled || busy}
    className={cn(
      'inline-flex shrink-0 items-center justify-center rounded-lg font-medium transition-colors',
      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600',
      'disabled:cursor-not-allowed',
      VARIANTS[variant],
      SIZES[size],
      className,
    )}
  >
    {busy ? <Spinner size={14} className="animate-spin" /> : icon}
    {children}
  </button>
);

/* -------------------------------------------------------------------------- */
/* Form fields                                                                 */
/* -------------------------------------------------------------------------- */

export const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ' +
  'transition-colors placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 ' +
  'disabled:bg-slate-100 disabled:text-slate-500';

export const Field = ({ label, hint, error, required, children, className }) => (
  <label className={cn('block', className)}>
    <span className="mb-1.5 flex items-baseline justify-between gap-2">
      <span className="text-xs font-semibold text-slate-700">
        {label}
        {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
      </span>
      {hint ? <span className="text-[11px] text-slate-400">{hint}</span> : null}
    </span>
    {children}
    {error ? <span className="mt-1 block text-[11px] font-medium text-rose-600">{error}</span> : null}
  </label>
);

export const Input = ({ error, className, ...rest }) => (
  <input {...rest} className={cn(inputClass, error && 'border-rose-400', className)} />
);

export const Textarea = ({ error, className, rows = 4, ...rest }) => (
  <textarea {...rest} rows={rows} className={cn(inputClass, 'resize-y', error && 'border-rose-400', className)} />
);

export const Select = ({ error, className, children, ...rest }) => (
  <select {...rest} className={cn(inputClass, 'cursor-pointer', error && 'border-rose-400', className)}>
    {children}
  </select>
);

/** A labelled checkbox that reads as a switch. */
export const Toggle = ({ checked, onChange, label, hint }) => (
  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 hover:bg-slate-50">
    <span
      className={cn(
        'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border transition-colors',
        checked ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300 bg-white',
      )}
    >
      {checked ? <Check size={11} /> : null}
    </span>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="sr-only"
    />
    <span className="min-w-0">
      <span className="block text-sm font-medium text-slate-800">{label}</span>
      {hint ? <span className="mt-0.5 block text-xs text-slate-500">{hint}</span> : null}
    </span>
  </label>
);

/**
 * A list of short strings edited as one textarea, one per line. Highlights,
 * terms and tags are all this shape, and a row of chip inputs would be a lot of
 * machinery for something a shopkeeper types once.
 */
export const LinesInput = ({ value, onChange, placeholder, rows = 4 }) => (
  <Textarea
    rows={rows}
    placeholder={placeholder}
    value={value.join('\n')}
    onChange={(e) => onChange(e.target.value.split('\n').map((l) => l.trim()).filter(Boolean))}
  />
);

/* -------------------------------------------------------------------------- */
/* Surfaces                                                                    */
/* -------------------------------------------------------------------------- */

export const Card = ({ title, subtitle, actions, children, className, bodyClass }) => (
  <section className={cn('rounded-xl border border-slate-200 bg-white shadow-sm', className)}>
    {(title || actions) && (
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div className="min-w-0">
          {title ? <h2 className="text-sm font-semibold text-slate-900">{title}</h2> : null}
          {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </header>
    )}
    <div className={cn('p-4', bodyClass)}>{children}</div>
  </section>
);

const BADGES = {
  neutral: 'bg-slate-100 text-slate-700',
  // An alias, so a status map can name the tone it means ("slate" for a
  // deactivated product) rather than the fallback it happens to share.
  slate: 'bg-slate-100 text-slate-700',
  teal: 'bg-teal-50 text-teal-700',
  amber: 'bg-amber-100 text-amber-800',
  rose: 'bg-rose-50 text-rose-700',
  indigo: 'bg-indigo-50 text-indigo-700',
  emerald: 'bg-emerald-50 text-emerald-700',
};

export const Badge = ({ tone = 'neutral', children, className }) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
      BADGES[tone] ?? BADGES.neutral,
      className,
    )}
  >
    {children}
  </span>
);

export const EmptyState = ({ title, hint, action }) => (
  <div className="grid place-items-center gap-2 px-4 py-14 text-center">
    <p className="text-sm font-semibold text-slate-700">{title}</p>
    {hint ? <p className="max-w-md text-xs text-slate-500">{hint}</p> : null}
    {action}
  </div>
);

export const Loading = ({ label = 'Loading' }) => (
  <div className="flex items-center justify-center gap-2 px-4 py-14 text-sm text-slate-500">
    <Spinner size={15} className="animate-spin" />
    {label}
  </div>
);

/* -------------------------------------------------------------------------- */
/* Table                                                                       */
/* -------------------------------------------------------------------------- */

export const Table = ({ head, children, className }) => (
  <div className={cn('overflow-x-auto', className)}>
    <table className="w-full min-w-[640px] border-collapse text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-left">
          {head.map((h) => (
            <th
              key={typeof h === 'string' ? h : h.key}
              className={cn(
                'whitespace-nowrap px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500',
                typeof h === 'object' && h.align === 'right' && 'text-right',
              )}
            >
              {typeof h === 'string' ? h : h.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">{children}</tbody>
    </table>
  </div>
);

export const Td = ({ align, className, children, ...rest }) => (
  <td
    {...rest}
    className={cn('px-3 py-2.5 align-middle text-slate-700', align === 'right' && 'text-right', className)}
  >
    {children}
  </td>
);

/* -------------------------------------------------------------------------- */
/* Drawer                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Right-hand editing drawer. A form this tall in a centred modal ends up
 * scrolling inside a box inside a page; a drawer gives it the full height and
 * keeps the list it came from visible beside it.
 */
export const Drawer = ({ open, onClose, title, subtitle, footer, children, wide = false }) => {
  const panel = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="flex-1 bg-slate-900/40 backdrop-blur-[1px]"
      />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'flex h-full w-full flex-col bg-slate-50 shadow-2xl outline-none',
          wide ? 'max-w-3xl' : 'max-w-xl',
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} icon={<X size={13} />} aria-label="Close" />
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>

        {footer ? (
          <footer className="flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-5 py-3">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
};
