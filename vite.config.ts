import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { apiSecurityPlugin } from "./apiSecurityPlugin";

export default defineConfig({
  plugins: [react(), tailwindcss(), apiSecurityPlugin()],
  resolve: { alias: { "@": path.resolve(process.cwd(), "src") } },
  server: {
    host: "0.0.0.0",
    port: Number(process.env.PORT || 5173),
    strictPort: true,
    allowedHosts: process.env.PUBLIC_TUNNEL_HOST ? [process.env.PUBLIC_TUNNEL_HOST] : [],
    proxy: {
      "/api/ollama": {
        target: "http://127.0.0.1:11434",
        changeOrigin: true,
        headers: { Origin: "http://localhost:11434" },
        rewrite: (requestPath) => requestPath.replace(/^\/api\/ollama/, ""),
      },
    },
  },
  preview: { host: "0.0.0.0", port: Number(process.env.PORT || 4173), strictPort: true },
});
