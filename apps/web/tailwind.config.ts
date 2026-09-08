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
          50: '#faeded',
          100: '#f4d7d8',
          200: '#e6b3b3',
          300: '#d27f80',
          400: '#c6393c',
          500: '#8a1a1c', // primary red (header / buttons / prices)
          600: '#671112', // hover / pressed
          700: '#510d0e',
          800: '#3b0a0b',
          900: '#270707',
          strip: '#721314', // dark top utility strip
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
