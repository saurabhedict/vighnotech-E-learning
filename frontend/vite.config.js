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
})
