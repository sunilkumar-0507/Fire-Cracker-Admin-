import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * The admin is its own application.
 *
 * It shares nothing with the storefront at runtime — no bundle, no origin, no
 * router. The two meet only at the REST API, which is the whole point: the
 * shop can be deployed, cached and scaled as a public static site while this
 * is kept on an internal host, behind a VPN, or simply not deployed at all.
 *
 * Port 5174 so both dev servers can run side by side (the storefront takes
 * 5173), and 4174 for preview against the storefront's 4173.
 */
const apiProxy = {
  '/api': {
    target: process.env.VITE_API_TARGET ?? 'http://localhost:5080',
    changeOrigin: true,
  },
};

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5174,
    proxy: apiProxy,
  },

  preview: { port: 4174, proxy: apiProxy },

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  build: {
    target: 'es2022',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // Same reasoning as the storefront: keep the libraries out of the
        // entry chunk so app changes do not invalidate them in cache.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/.test(id))
            return 'react';
          if (id.includes('react-icons')) return 'icons';
          return 'vendor';
        },
      },
    },
  },
});
