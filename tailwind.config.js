/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        baby: {
          50: '#F4FAFE',
          100: '#E6F3FB',
          200: '#CBE7F7',
          300: '#A9D7F0',
          400: '#84C2E6',
          500: '#4F9FCF',
          700: '#23678F',
          800: '#1A4D6B',
        },
        lavender: {
          50: '#F9F7FD',
          100: '#F0EBFA',
          200: '#DFD5F4',
          300: '#C8B9EC',
          400: '#AB97DE',
          500: '#8A72C8',
          700: '#5A4A8C',
          800: '#443770',
        },
        peach: {
          50: '#FFF9F5',
          100: '#FFF0E6',
          200: '#FDDECD',
          300: '#F9C7AA',
          400: '#F3A982',
          500: '#E0865B',
          700: '#9C4D2A',
          800: '#743820',
        },
        cream: {
          50: '#FFFDF9',
          100: '#FBF6EE',
          200: '#F4EBDD',
          300: '#E9DCC7',
        },
        charcoal: {
          500: '#6B6B76',
          600: '#4E4E59',
          700: '#3A3A44',
          800: '#2B2B33',
          900: '#1B1B21',
        },
        success: { 100: '#E3F4EC', 700: '#2D6B4F' },
        warning: { 100: '#FDF3DC', 700: '#8A5E0E' },
        danger: { 100: '#FBE7E5', 700: '#A3302A' },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 40px -12px rgba(43, 43, 51, 0.12)',
        lift: '0 24px 60px -20px rgba(43, 43, 51, 0.25)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        drift: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(20px, -16px) scale(1.04)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.8s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.6s ease-out both',
        drift: 'drift 14s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
