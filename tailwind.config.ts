import type { Config } from 'tailwindcss'

export default {
  content: [
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './composables/**/*.{js,ts}',
    './plugins/**/*.{js,ts}',
    './app.vue',
    './error.vue'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#07080e',
        surface: '#0f1119',
        surface2: '#161a26',
        surface3: '#1f2533',
        surface4: '#283042',
        border: '#222a3c',
        border2: '#313c54',
        border3: '#414f6e',
        acid: '#e8ff47',
        'acid-dim': '#454f17',
        miku: '#39d4c8',
        pink: '#ff4da6',
        green: '#5dffb0',
        amber: '#ffb84d',
        text: '#dfe6f0',
        muted: '#54607a',
        muted2: '#808ea8',
        revx: {
          pink: '#e6007a', // Polkadot pink
          purple: '#6d3aee',
          cyan: '#00e5ff',
          dark: '#0b0c10',
          panel: '#12141c',
          card: '#181b26',
          border: '#232736',
          accent: '#e6007a'
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        orbitron: ['"Orbitron"', 'sans-serif'],
        rajdhani: ['"Rajdhani"', 'sans-serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        'glow-acid': '0 0 14px rgba(232,255,71,.35)',
        'glow-miku': '0 0 12px rgba(57,212,200,.35)',
        'glow-pink': '0 0 14px rgba(230,0,122,.4)',
        'glow-cyan': '0 0 14px rgba(0,229,255,.35)'
      }
    }
  },
  plugins: []
} satisfies Config
