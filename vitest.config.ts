import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: [
      '**/__tests__/**/*.(ts|tsx|js)',
      '**/*.(test|spec).(ts|tsx|js)'
    ],
    coverage: {
      include: [
        'src/**/*.(ts|tsx)',
      ],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.stories.*',
        'src/**/index.ts',
      ],
    },
    globals: true,
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, './src'),
      '@': resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['next/server'],
  },
});
