import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  define: {
    global: "window", 
  },
  optimizeDeps: {
    include: ["jwt-decode", "mathjs"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "~": path.resolve(__dirname, "node_modules"),
    },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["mathjs", "jwt-decode"],
        },
      },
    },
  },
  server: {
    watch: {
      usePolling: true,
    },
    host: true,
    port: 3000,
    strictPort: true,
    hmr: {
      protocol: "ws",
      host: "localhost",
      port: 3000,
    },
  },
  preview: {
    watch: {
      usePolling: true,
    },
    port: 3000,
  },
})
