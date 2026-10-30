import { defineConfig } from "vitest/config";

export default defineConfig({
  // relative Pfade: läuft auf eigener Domain genauso wie unter github.io/<repo>/
  base: "./",
  build: {
    rollupOptions: {
      input: { index: "index.html", impressum: "impressum.html", datenschutz: "datenschutz.html", kiosk: "kiosk.html" },
    },
  },
  test: { include: ["src/**/*.test.ts"] },
});
