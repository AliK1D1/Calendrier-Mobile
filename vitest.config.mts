import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Tests des fonctions pures : la logique d'horaire copiée du site (mêmes tests que le site)
// et les fonctions propres au mobile (src/services, src/features).
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
