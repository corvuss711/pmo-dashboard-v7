import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Served from http://<host>/phase3/ in production, so built asset URLs must carry that prefix.
  // Dev keeps the default "/" since Vite serves straight off localhost:5173.
  base: command === "build" ? "/phase3/" : "/",
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
}));
