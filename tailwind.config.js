/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        vigno: {
          bg1: '#7a1f2b', bg2: '#b23a2e', bg3: '#e67e22',
          panel: '#2a1418', card: '#241317', line: '#5a2b30',
          txt: '#f3e9e4', muted: '#caa9a2', accent: '#e67e22', accent2: '#ffb24d',
        },
      },
      fontFamily: { sans: ['Segoe UI', 'system-ui', 'Arial', 'sans-serif'] },
    },
  },
  plugins: [],
}
