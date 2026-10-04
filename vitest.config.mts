import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**'],
      exclude: ['src/lib/color/browser.ts', 'src/lib/sample/flats.ts'],
      reporter: ['text-summary', 'json', 'json-summary'],
      thresholds: { 'src/lib/engine/**': { lines: 90 }, 'src/lib/color/**': { lines: 90 } },
    },
  },
});
