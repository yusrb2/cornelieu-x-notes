import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/',
  plugins: [
    preact(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: [
        'favicon-32.png',
        'apple-touch-icon.png',
        'cornelieu-icon.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'pwa-maskable-512x512.png',
        'fonts/*.woff2',
      ],
      manifest: {
        name: 'Cornelieu X Notes',
        short_name: 'Cornelieu',
        description:
          'Local-first Cornell note-taking app with active recall and spaced repetition.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#F6F8F7',
        background_color: '#F6F8F7',
        categories: ['productivity', 'education', 'utilities'],
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: false,
        skipWaiting: false,
      },
    }),
  ],
  build: {
    target: 'es2022',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes('node_modules/preact') ||
            id.includes('node_modules/@preact/signals') ||
            id.includes('node_modules/idb')
          ) {
            return 'vendor';
          }
          return undefined;
        },
      },
    },
  },
});
