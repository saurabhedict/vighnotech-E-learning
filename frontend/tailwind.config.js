/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        vigno: {
          // Aviation: midnight navy backgrounds
          bg1: '#0a0f1e', bg2: '#0d1530', bg3: '#1a2a5e',
          // Panels
          panel: '#0f1829', card: '#0c1422', line: '#1e3060',
          // Text
          txt: '#e8f0ff', muted: '#7a9cc4',
          // Accents: gold + sky blue
          accent: '#f0c040',   // instrument gold (primary CTA)
          accent2: '#4da6ff',  // sky blue (links, highlights)
        },
      },
      fontFamily: { sans: ['Segoe UI', 'system-ui', 'Arial', 'sans-serif'] },
    },
  },
  plugins: [],
}
