import type { Config } from 'tailwindcss';

/**
 * Design tokens derived from the storefront screenshots (Bajaar-style theme):
 * bright red primary, light-grey page, white cards, pale-green accents, Poppins.
 * The admin portal reuses these tokens in a utilitarian sidebar + tables layout.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdecef',
          100: '#fbd0d9',
          200: '#f4a3b4',
          300: '#ec748f',
          400: '#e6486d',
          500: '#e92c46', // primary red (header / buttons / prices)
          600: '#cf2038', // hover / pressed
          700: '#a81b2f',
          800: '#7f1624',
          900: '#5c111b',
          strip: '#c4283d', // dark top utility strip
        },
        accent: {
          50: '#f1f7f4',
          100: '#dce9e2', // category-tile green
          200: '#bcd6c8',
          600: '#3f7d5f',
        },
        ink: {
          DEFAULT: '#1f1f1f',
          soft: '#4a4a4a',
          muted: '#8a8a8a',
          faint: '#b8b8b8',
        },
        paper: {
          DEFAULT: '#ffffff',
          sunken: '#f2f2f3', // page background
          line: '#ececec', // borders
        },
      },
      fontFamily: {
        sans: ['var(--font-poppins)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '6px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        pop: '0 8px 30px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
};

export default config;
