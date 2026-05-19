/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        bg: '#0a0a0f',
        surface: '#111118',
        border: '#1e1e2e',
        accent: '#5865f2',
        'accent-dim': '#3c4280',
        found: '#22c55e',
        notfound: '#ef4444',
        partial: '#f59e0b',
        muted: '#6b7280',
        text: '#e2e8f0',
        'text-dim': '#94a3b8',
      },
    },
  },
  plugins: [],
};
