/** @type {import('tailwindcss').Config} */
// Palette is driven by CSS variables (RGB channels) defined in index.css, so the
// same `vigno-*` utilities adapt between the dark and light themes — and Tailwind
// opacity modifiers (e.g. bg-vigno-accent/25) still work.
const v = (name) => `rgb(var(--v-${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        vigno: {
          bg1: v('bg1'), bg2: v('bg2'), bg3: v('bg3'),
          panel: v('panel'), card: v('card'), line: v('line'),
          txt: v('txt'), muted: v('muted'),
          accent: v('accent'), accent2: v('accent2'),
          'accent-txt': v('accent-txt'),
        },
      },
      fontFamily: {
        sans: ['"Libre Baskerville"', 'Georgia', 'serif'],
        serif: ['"Crimson Text"', 'Georgia', 'serif'],
        montserrat: ['Montserrat', 'sans-serif'],
        crimson: ['"Crimson Text"', 'serif'],
        baskerville: ['"Libre Baskerville"', 'serif'],
      },
    },
  },
  plugins: [],
}

