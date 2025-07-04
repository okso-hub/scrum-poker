import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}'],
    globals: true,
  },
});
