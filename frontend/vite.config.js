import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite config — React plugin + dev server.
export default defineConfig({
  plugins: [react()],
  server: {
    // Listen on all interfaces (IPv4 + IPv6) so http://127.0.0.1:5173 and
    // http://localhost:5173 both work — Windows/Chrome often prefers IPv4,
    // while Vite would otherwise bind IPv6-only (::1) and refuse 127.0.0.1.
    host: true,
    port: 5173,
    open: true,
    // Allow importing the sibling @vigno/shared package, which resolves to
    // ../shared (outside this app's root) via the file: dependency symlink.
    fs: { allow: ['..'] },
  },
  build: {
    rollupOptions: {
      output: {
        // Split rarely-changing vendor code into its own long-cached chunks so a
        // routine app-code change doesn't bust the whole bundle hash for returning
        // users. (Heavy media libs — hls.js / pdfjs / three — are intentionally NOT
        // listed here; they stay route/component-lazy so they load only on demand.)
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'state-vendor': ['@reduxjs/toolkit', 'react-redux', '@tanstack/react-query'],
        },
      },
    },
  },
})
