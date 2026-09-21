import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import AdminLayout from '@/AdminLayout';

/**
 * Route table.
 *
 * Routes are at the root (`/products`, not `/admin/products`) because this is
 * its own application on its own origin now — there is no storefront above it
 * to be a sub-path of. Deploy it wherever you like; nothing here assumes a
 * base path except Vite's own `base`, which is a build flag.
 *
 * Every screen is lazy. The admin is not performance-critical, but the shape
 * keeps a slow first paint from being anybody's fault but the network's, and
 * the layout is eager so the sidebar and gate render immediately.
 */
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Products = lazy(() => import('@/pages/Products'));
const Stock = lazy(() => import('@/pages/Stock'));
const Inventory = lazy(() => import('@/pages/Inventory'));
const Discounts = lazy(() => import('@/pages/Discounts'));
const Combos = lazy(() => import('@/pages/Combos'));
const Categories = lazy(() => import('@/pages/Categories'));
const Orders = lazy(() => import('@/pages/Orders'));
const Enquiries = lazy(() => import('@/pages/Enquiries'));
const Analytics = lazy(() => import('@/pages/Analytics'));
const Database = lazy(() => import('@/pages/Database'));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AdminLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'products', element: <Products /> },
      { path: 'stock', element: <Stock /> },
      { path: 'inventory', element: <Inventory /> },
      { path: 'discounts', element: <Discounts /> },
      { path: 'combos', element: <Combos /> },
      { path: 'categories', element: <Categories /> },
      { path: 'orders', element: <Orders /> },
      { path: 'enquiries', element: <Enquiries /> },
      { path: 'analytics', element: <Analytics /> },
      { path: 'database', element: <Database /> },
      // Anything else is a typed URL or a stale bookmark from when this lived
      // under /admin on the storefront. Send it to the dashboard rather than
      // showing a 404 for what is, at worst, an old link.
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

export default router;
