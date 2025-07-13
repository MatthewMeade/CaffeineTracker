import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
  ],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // More specific include patterns to avoid node_modules
    include: [
      "src/**/__tests__/**/*.(ts|tsx|js)",
      "src/**/*.(test|spec).(ts|tsx|js)",
      "__tests__/**/*.(ts|tsx|js)"
    ],
    exclude: [
      "**/node_modules/**",
      "**/test-utils.ts",
      "**/vitest.setup.ts",
      "**/dist/**",
      "**/.next/**"
    ],

    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      all: true,

      include: ["src/**/*"],

      exclude: [
        "**/*.d.ts",
        "**/__tests__/**",
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.config.ts",
        "**/*.config.js",
        "src/env.js",
        "src/server/auth/**",
        "src/app/api/auth/[...nextauth]/route.ts",
        "src/auth.ts",
      ],
    },
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false
      }
    },
    hookTimeout: 30000,
    testTimeout: 10000
  },
});
