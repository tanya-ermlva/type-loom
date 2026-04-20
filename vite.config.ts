/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // GitHub Pages serves the project at /<repo-name>/ — set the base so
  // built assets resolve correctly. Local dev (npm run dev) ignores this.
  base: process.env.GITHUB_ACTIONS ? '/type-loom/' : '/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
});
