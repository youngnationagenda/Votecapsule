import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#0B3C6D',
          'primary-light': '#2563EB',
          'primary-dark': '#072A4D',
        },
        emerald: {
          DEFAULT: '#059669',
          light: '#34D399',
        },
        amber: {
          DEFAULT: '#D97706',
        },
        neutral: {
          900: '#111827',
          800: '#1F2937',
          700: '#374151',
          600: '#4B5563',
          500: '#6B7280',
          400: '#9CA3AF',
          300: '#D1D5DB',
          200: '#E5E7EB',
          100: '#F3F4F6',
          50: '#F9FAFB',
        },
      },
      fontFamily: {
        sans: ["'Inter'", '-apple-system', 'BlinkMacSystemFont', "'Segoe UI'", 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
