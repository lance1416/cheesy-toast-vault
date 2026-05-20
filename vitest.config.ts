import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: [
        "src/lib/**",
        "src/server/api-error.ts",
        "src/components/**",
        "src/app/(auth)/**",
        "src/app/(vault)/_components/**",
      ],
    },
  },
  resolve: {
    alias: { "@": resolve(__dirname, "./src") },
  },
});
