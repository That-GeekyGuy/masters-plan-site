import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Served at that-geekyguy.xyz/bin, so assets live under /bin/ too.
export default defineConfig({
  base: "/bin/",
  build: { outDir: "dist/bin", emptyOutDir: true },
  plugins: [react(), tailwindcss()],
});
