import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@/generated/prisma": path.resolve(__dirname, "./src/generated/prisma/client.ts"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
