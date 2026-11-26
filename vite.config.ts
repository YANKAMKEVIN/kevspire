import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: { target: 'es2020', assetsInlineLimit: 0, chunkSizeWarningLimit: 600 },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    coverage: { provider: 'v8', include: ['src/**'] },
  },
});
