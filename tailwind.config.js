/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Phase 27: clean black/white system + babyblau accent
        bg: '#FFFFFF',
        paper: '#F5F5F7',
        // Legacy "warm" tokens retargeted to the new neutral palette so
        // existing components automatically adopt the new look.
        warm: {
          1: '#000000',           // primary text / former sage primary
          2: '#6E6E73',           // secondary text
          3: '#E5E5EA',           // borders / separators
          4: '#F5F5F7',           // subtle backgrounds
        },
        accent: {
          DEFAULT: '#5AC8FA',     // Babyblau – the only accent color
          light: '#E5F6FE',
          dark: '#0A84FF',
        },
        gold: {
          DEFAULT: '#FFD60A',     // kept for Impact Map / Erhörte Gebete
          light: '#FFF4B8',
        },
        dark: {
          DEFAULT: '#000000',
          muted: '#6E6E73',
          light: '#AEAEB2',
        },
        primary: '#5AC8FA',
        success: '#34C759',
        error: '#FF3B30',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'Helvetica Neue', 'sans-serif'],
        serif: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'Helvetica Neue', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'glass-sm': '0 1px 1px 0 rgba(0, 0, 0, 0.03)',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '14px',
        '3xl': '16px',
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
