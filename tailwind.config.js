/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#F7F3EC',
        paper: '#EDE8DF',
        warm: {
          1: '#4A6741',
          2: '#395132',
          3: '#D8D2C5',
          4: '#EBE5D9',
        },
        accent: {
          DEFAULT: '#C4974A',
          light: '#DEBA78',
          dark: '#9E7736',
        },
        gold: {
          DEFAULT: '#C4974A',
          light: '#DEBA78',
        },
        dark: {
          DEFAULT: '#2C2416',
          muted: '#706351',
          light: '#A1927F',
        },
        primary: '#4A6741',
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        serif: ['Lora', 'Georgia', 'serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(58, 46, 36, 0.08)',
        'glass-sm': '0 4px 16px 0 rgba(58, 46, 36, 0.06)',
      },
      animation: {
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        }
      }
    },
  },
  plugins: [],
}
