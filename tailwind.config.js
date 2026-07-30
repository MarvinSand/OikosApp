/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Phase 27: clean black/white system + babyblau accent.
        // Tokens point at CSS variables so the whole app (Tailwind utilities
        // AND inline var() styles) re-themes via a single [data-theme] switch.
        bg: 'var(--color-bg)',
        // Theme-aware card/sheet surface (white in light, dark grey in dark).
        // Use instead of the hardcoded Tailwind `white` for elevated surfaces.
        surface: 'var(--color-surface)',
        paper: 'var(--color-bg-secondary)',
        // Legacy "warm" tokens retargeted to the new neutral palette so
        // existing components automatically adopt the new look.
        warm: {
          1: 'var(--color-text)',            // primary text
          2: 'var(--color-text-secondary)',  // secondary text
          3: 'var(--color-border)',          // borders / separators
          4: 'var(--color-bg-secondary)',    // subtle backgrounds
        },
        accent: {
          DEFAULT: 'var(--color-accent)',    // Babyblau – the only accent color
          light: 'var(--color-accent-light)',
          dark: 'var(--color-accent-dark)',
        },
        gold: {
          DEFAULT: 'var(--color-gold)',     // kept for Impact Map / Erhörte Gebete
          light: 'var(--color-gold-light)',
          text: 'var(--color-gold-text)',
        },
        dark: {
          DEFAULT: 'var(--color-text)',
          muted: 'var(--color-text-secondary)',
          light: 'var(--color-text-tertiary)',
        },
        primary: 'var(--color-accent)',
        success: 'var(--color-success)',
        error: {
          DEFAULT: 'var(--color-error)',
          bg: 'var(--color-error-bg)',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Helvetica Neue', 'sans-serif'],
        serif: ['Lora', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
      boxShadow: {
        'glass': '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'glass-sm': '0 1px 1px 0 rgba(0, 0, 0, 0.03)',
        // Premium elevation scale (theme-aware via CSS variables)
        'e-xs': 'var(--shadow-xs)',
        'e-sm': 'var(--shadow-sm)',
        'e-md': 'var(--shadow-md)',
        'e-lg': 'var(--shadow-lg)',
        'accent': 'var(--shadow-accent)',
        'bubble': 'var(--shadow-bubble)',
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
