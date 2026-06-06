import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite config — React plugin + dev server.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    // Allow importing the sibling @vigno/shared package, which resolves to
    // ../shared (outside this app's root) via the file: dependency symlink.
    fs: { allow: ['..'] },
  },
})
