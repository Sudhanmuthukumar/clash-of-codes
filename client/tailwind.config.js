/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          300: '#fde047',
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
        },
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        wood: {
          700: '#452a1a',
          800: '#341f12',
          900: '#23140a',
          950: '#150b05',
        },
        stone: {
          700: '#383b42',
          800: '#26282e',
          900: '#1a1c22',
          950: '#101216',
        },
        primary: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#78350f',
          900: '#451a03',
        },
        dark: {
          50: '#f3f3f8',
          100: '#e4e4ee',
          200: '#cdcee0',
          300: '#abacca',
          400: '#8284b0',
          500: '#636598',
          600: '#515181',
          700: '#3a3b4c',
          800: '#242533',
          900: '#161722',
          950: '#0d0e15',
        },
        accent: {
          gold: '#f59e0b',
          bronze: '#d97706',
          green: '#10b981',
          red: '#ef4444',
          cyan: '#06b6d4',
          purple: '#8b5cf6',
          orange: '#f97316',
        },
      },
      fontFamily: {
        clash: ['"Lilita One"', 'cursive', 'sans-serif'],
        war: ['"Russo One"', 'Cinzel', 'sans-serif'],
        fantasy: ['Cinzel', 'Trajan Pro', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0, 212, 255, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 212, 255, 0.4)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
