/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./site/**/*.{html,js}"],
  theme: {
    extend: {
      colors: {
        bgPrimary: '#0a0e17',
        bgSecondary: '#121826',
        bgTertiary: '#1a2235',
        textPrimary: '#e2e8f0',
        textSecondary: '#94a3b8',
        textMuted: '#64748b',
        accentPrimary: '#38bdf8',
        accentWarm: '#f59e0b',
        borderColor: '#1e293b',
      },
      fontFamily: {
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['"Space Grotesk"', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
