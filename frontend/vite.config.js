import path from "path"
import { fileURLToPath } from "url"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import tailwindcss from "@tailwindcss/vite"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
<<<<<<< HEAD
  plugins: [react()],
  define: {
    global: "window", 
=======
  base: "/siaps/",
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "redirect-middleware",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.originalUrl || req.url

          if (url === "/" || url === "/siaps") {
            res.writeHead(302, { Location: "/siaps/" })
            res.end()
            return
          }

          next()
        })
      },
    },
  ],
  define: {
    global: "window",
>>>>>>> dbv2
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
    outDir: "dist",
  },
  server: {
    watch: {
      usePolling: true,
    },
    host: true,
    port: 4000,
    cors: true,
    strictPort: true,
    hmr: {
      protocol: "ws",
      host: "localhost",
      port: 4000,
    },
    allowedHosts: ["polban-space.cloudias79.com"],
    historyApiFallback: {
      disableDotRule: true,
      index: "/siaps/",
    },
  },
  preview: {
    watch: {
      usePolling: true,
    },
    port: 4000,
    strictPort: true,
    host: true,
    allowedHosts: ["polban-space.cloudias79.com"],
  },
})
