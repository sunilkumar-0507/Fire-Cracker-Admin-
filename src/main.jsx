import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '@/App';
import { load } from '@/lib/catalog';
import '@/styles.css';

/**
 * The catalogue is fetched before React mounts.
 *
 * Every screen reads `products`, `categories` and friends synchronously at
 * render time, the same way the storefront does. Pulling the catalogue first
 * keeps that true, and means no screen needs a loading state for something it
 * can always read straight away.
 *
 * A failure is not fatal here either — it renders the gate with a message
 * saying the API is not answering, which is the one thing a shopkeeper looking
 * at a blank admin actually needs to be told.
 */
const status = await load();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App offline={!status.ok} offlineReason={status.reason} />
  </StrictMode>,
);
