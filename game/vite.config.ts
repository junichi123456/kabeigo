/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'カベガコイ',
        short_name: 'カベガコイ',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#1F2A36',
        background_color: '#1F2A36',
        start_url: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,png,svg,webp,jpg}'], maximumFileSizeToCacheInBytes: 5_000_000 },
    }),
  ],
  build: { chunkSizeWarningLimit: 900 },
  test: { include: ['tests/unit/**/*.test.ts'] },
});
