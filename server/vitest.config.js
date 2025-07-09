import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',

    include: [
      '**/tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}',
    ],
    
    exclude: [
      'public/**/*'
    ],

    globals: true,

    coverage: {
      reporter: ['text', 'lcov'],

      exclude: [
        'public/js/**',
        'public/js/components/**',
        'public/js/pages/**',
        'public/js/utils/**',

        'server/dist/**',
        '**/*.d.ts',

        'vitest.config.*',
      ],
    },
  },
});
