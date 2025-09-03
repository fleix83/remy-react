/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        // CSS Custom Property Support
        'css-primary': 'var(--primary)',
        'css-salmon': 'var(--salmon)',
        'css-salmon-hover': 'var(--salmon-hover)',
        'css-type': 'var(--type)',
        'css-bg-body': 'var(--bg-body)',
        'css-bg-element': 'var(--bg-element)',
        'css-bg-element-hover': 'var(--bg-element-hover)',
        'css-erfahrung': 'var(--bg-erfahrung)',
        'css-suche': 'var(--bg-suche)',
        'css-gedanken': 'var(--bg-gedanken)',
        'css-rant': 'var(--bg-rant)',
        'css-ressourcen': 'var(--bg-ressourcen)'
      },
      fontFamily: {
        'body': ['"Nunito Sans"', 'sans-serif'],
        'headline': ['"Nunito"', 'sans-serif'],
        'gaegu': ['"Gaegu"', 'cursive'],
        sans: ['"Nunito Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}