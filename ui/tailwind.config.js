/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './index.html',
  ],
  darkMode: 'class',
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
          950: '#0c4a6e',
        },
        'theme-bg': 'var(--theme-bg)',
        'theme-surface': 'var(--theme-surface)',
        'theme-surface-1': 'var(--theme-surface-1)',
        'theme-border': 'var(--theme-border)',
        'theme-border-strong': 'var(--theme-border-strong)',
        'theme-text': 'var(--theme-text)',
        'theme-text-primary': 'var(--theme-text-primary)',
        'theme-text-secondary': 'var(--theme-text-secondary)',
        'theme-text-muted': 'var(--theme-text-muted)',
        'theme-accent': 'var(--theme-accent)',
        'theme-accent-text': 'var(--theme-accent-text)',
        'theme-good': 'var(--theme-good)',
        'theme-critical': 'var(--theme-critical)',
        'theme-warning': 'var(--theme-warning)',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '28': '7rem',
        '44': '11rem',
      },
      borderRadius: {
        'lg': '12px',
        'xl': '16px',
      },
      boxShadow: {
        'sidebar': '4px 0 16px rgba(0, 0, 0, 0.15)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
        'focus': '0 0 0 2px rgba(59, 130, 246, 0.5)',
      },
      typography: {
        DEFAULT: {
          css: {
            '--tw-prose-bold': 'var(--theme-text-primary)',
            '--tw-prose-bullets': 'var(--theme-accent)',
            '--tw-prose-code': 'var(--theme-text-secondary)',
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
