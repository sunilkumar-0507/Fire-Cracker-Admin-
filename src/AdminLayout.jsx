import { Suspense, useCallback, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminPasscode } from '@/lib/api';
import { reload as reloadCatalog } from '@/lib/catalog';
import { cn } from '@/utils/cn';
import AdminGate from '@/AdminGate';
import { Button, Loading } from '@/ui';
import {
  ArrowUpRight,
  Bolt,
  Database,
  Eye,
  FileText,
  Gift,
  Menu,
  Package,
  ShoppingBag,
  Spinner,
  Tag,
  Truck,
  Users,
  Wallet,
  X,
} from '@/components/icons';

/**
 * Routes live at the root now that this is its own application rather than a
 * branch of the storefront's router.
 */
const NAV = [
  { to: '/', end: true, label: 'Dashboard', icon: Bolt },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/stock', label: 'Stock levels', icon: FileText },
  { to: '/inventory', label: 'Stock monitor', icon: Wallet },
  // "Discounts" hid what this screen is for: every row on it is a coupon code
  // the checkout accepts.
  { to: '/discounts', label: 'Coupons', icon: Tag },
  { to: '/combos', label: 'Combo packs', icon: Gift },
  { to: '/categories', label: 'Categories', icon: ShoppingBag },
  { to: '/orders', label: 'Orders', icon: Truck },
  { to: '/enquiries', label: 'Enquiries', icon: Users },
  { to: '/analytics', label: 'Analytics', icon: Eye },
  // Last, and deliberately: it is the only screen that is about the server
  // rather than about the shop.
  { to: '/database', label: 'Database', icon: Database },
];

/**
 * Where the shop is, for the "open the storefront" link.
 *
 * The two are separate deployments on separate origins, so this cannot be a
 * relative "/" any more. Set VITE_STOREFRONT_URL at build time; the default is
 * the storefront's dev server.
 */
const STOREFRONT_URL = import.meta.env.VITE_STOREFRONT_URL ?? 'http://localhost:5173';

const Sidebar = ({ onNavigate }) => (
  <nav className="flex h-full flex-col gap-1 p-3">
    <div className="mb-4 px-2 pt-2">
      <p className="font-display text-lg font-semibold text-white">SKV Pyros</p>
      <p className="text-[11px] uppercase tracking-[.18em] text-slate-500">Shop admin</p>
    </div>

    {NAV.map(({ to, end, label, icon: Icon }) => (
      <NavLink
        key={to}
        to={to}
        end={end}
        onClick={onNavigate}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            isActive
              ? 'bg-teal-500/15 text-teal-300'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100',
          )
        }
      >
        <Icon size={15} className="shrink-0" />
        {label}
      </NavLink>
    ))}

    <div className="mt-auto border-t border-slate-800 pt-3">
      <a
        href={STOREFRONT_URL}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-100"
      >
        <ArrowUpRight size={13} />
        Open the shop
      </a>
      <p className="px-3 pt-2 text-[11px] leading-relaxed text-slate-600">Sivakasi · Since 1994</p>
    </div>
  </nav>
);

/**
 * Admin shell.
 *
 * Everything below the gate renders inside this: a fixed slate sidebar and a
 * light workspace. `reload` is passed down through the outlet context — a screen
 * that has just written to the catalogue calls it so both the API-backed data
 * module and any sibling screen see the change without a page refresh.
 */
export const AdminLayout = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reloading, setReloading] = useState(false);
  const navigate = useNavigate();

  const reload = useCallback(async () => {
    setReloading(true);
    try {
      await reloadCatalog();
    } catch (error) {
      toast.error(`Could not reload the catalogue: ${error.message}`);
    } finally {
      setReloading(false);
    }
  }, []);

  const signOut = () => {
    adminPasscode.clear();
    navigate('/', { replace: true });
    // A full reload drops every screen's in-memory copy of the catalogue along
    // with the passcode, rather than leaving admin data on screen behind a gate.
    window.location.reload();
  };

  return (
    <AdminGate>
      <div className="min-h-screen bg-slate-100 text-slate-900">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 hidden w-60 bg-slate-900 lg:block">
          <Sidebar />
        </aside>

        {/* Mobile drawer */}
        {menuOpen ? (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div className="w-64 bg-slate-900">
              <Sidebar onNavigate={() => setMenuOpen(false)} />
            </div>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
              className="flex-1 bg-slate-900/50"
            />
          </div>
        ) : null}

        <div className="lg:pl-60">
          <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setMenuOpen((v) => !v)}
              icon={menuOpen ? <X size={14} /> : <Menu size={14} />}
              aria-label="Menu"
            />

            <span className="text-sm font-semibold text-slate-800 lg:hidden">Admin</span>

            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                busy={reloading}
                onClick={reload}
                icon={<Spinner size={13} />}
              >
                Reload
              </Button>
              <Button variant="ghost" size="sm" onClick={signOut}>
                Lock
              </Button>
            </div>
          </header>

          <main className="mx-auto max-w-7xl px-4 py-6">
            <Suspense fallback={<Loading label="Loading screen" />}>
              <Outlet context={{ reload }} />
            </Suspense>
          </main>
        </div>
      </div>
    </AdminGate>
  );
};

export default AdminLayout;
