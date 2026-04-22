/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // GitHub Pages serves the project at /<repo-name>/ — set the base so
  // built assets resolve correctly. Local dev (npm run dev) ignores this.
  base: process.env.GITHUB_ACTIONS ? '/type-loom/' : '/',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        // Main Type Loom app
        main: resolve(__dirname, 'index.html'),
        // Word-flow prototype (separate experimental app, shares deps only)
        wordFlow: resolve(__dirname, 'prototypes/word-flow/index.html'),
      },
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
});
