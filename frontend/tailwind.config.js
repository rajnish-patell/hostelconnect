/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Public Sans', 'Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Public Sans', 'Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#C8FAD6',
          100: '#A3E8B8',
          200: '#77DD9B',
          300: '#5BE49B',
          400: '#1FCA7D',
          500: '#00A76F',
          600: '#00A76F',
          700: '#007849',
          800: '#004B2F',
          900: '#002B1B',
          950: '#001A10',
        },
        minimals: {
          dark: '#1C252E',
          body: '#637381',
          muted: '#919EAB',
          bg: '#F9FAFB',
          card: '#FFFFFF',
          border: 'rgba(145, 158, 171, 0.16)',
          info: '#078DEE',
          warning: '#FFAB00',
          danger: '#FF5630',
        },
      },
      boxShadow: {
        'card': '0 0 2px 0 rgba(145, 158, 171, 0.2), 0 12px 24px -4px rgba(145, 158, 171, 0.12)',
        'card-hover': '0 0 2px 0 rgba(145, 158, 171, 0.24), 0 20px 40px -4px rgba(145, 158, 171, 0.16)',
        'modal': '0 0 2px 0 rgba(145, 158, 171, 0.24), -20px 20px 40px -4px rgba(145, 158, 171, 0.24)',
        'z8': '0 8px 16px 0 rgba(145, 158, 171, 0.16)',
        'z16': '0 16px 32px -4px rgba(145, 158, 171, 0.12)',
        'z24': '0 24px 48px 0 rgba(145, 158, 171, 0.16)',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      }
    },
  },
  plugins: [],
}
