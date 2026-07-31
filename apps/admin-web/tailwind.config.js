/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Vote Capsule™ Brand Colors — sourced from design-tokens package
        brand: {
          primary: '#0B3C6D',
          'primary-light': '#2563EB',
          'primary-dark': '#072A4D',
          secondary: '#F5F7FA',
        },
        // Alias for convenience
        vc: {
          navy: '#0B3C6D',
          blue: '#2563EB',
          bg: '#F5F7FA',
          surface: '#FFFFFF',
          'text-primary': '#111827',
          'text-secondary': '#6B7280',
          border: '#D1D5DB',
        },
        // Evidence capsule status colors
        capsule: {
          draft: '#9CA3AF',
          submitted: '#3B82F6',
          'ai-verified': '#8B5CF6',
          approved: '#10B981',
          rejected: '#EF4444',
          published: '#0B3C6D',
        },
        // Trust/integrity status — NEVER use "blockchain"
        trust: {
          verified: '#10B981',
          pending: '#F59E0B',
          unverified: '#9CA3AF',
          failed: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0.375rem',
      },
    },
  },
  plugins: [],
};
