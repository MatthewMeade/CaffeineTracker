import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  root: '.', // 👈 THE CRITICAL FIX
  plugins: [
    react(),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    tsconfigPaths(),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    // This part is fine, as Vitest is correctly finding your tests
    include: [
      '**/__tests__/**/*.(ts|tsx|js)',
      '**/*.(test|spec).(ts|tsx|js)'
    ],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      all: true,

      // Now that the root is set, this relative path will work correctly
      include: ['src/**/*'],

      // A more robust exclude list
      exclude: [
        '**/*.d.ts',
        '**/__tests__/**',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.config.ts',
        '**/*.config.js',
        'src/env.js',
        'src/server/auth/**', // Excluding complex auth logic
        'src/app/api/auth/[...nextauth]/route.ts',
        'src/auth.ts',
      ],
    },
  }
});