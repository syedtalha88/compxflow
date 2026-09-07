/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#3D52A0',
          secondary: '#2D3E7A',
          light: '#EEF1FB',
        },
        neutral: {
          bg: '#F5F6FA',
          card: '#FFFFFF',
          primary: '#1A1D23',
          secondary: '#4A5568',
          tertiary: '#8A94A6',
          border: '#E8EBF0',
          divider: '#F0F2F6',
        },
        status: {
          pending: { bg: '#FEF3C7', text: '#92400E' },
          partial: { bg: '#DBEAFE', text: '#1E40AF' },
          paid: { bg: '#D1FAE5', text: '#065F46' },
        },
        semantic: {
          error: { bg: '#FEF2F2', text: '#DC2626' },
          success: { bg: '#F0FDF4', text: '#16A34A' },
          warning: { bg: '#FFFBEB', text: '#D97706' },
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'level-1': '0px 1px 3px rgba(0, 0, 0, 0.06), 0px 1px 2px rgba(0, 0, 0, 0.04)',
        'level-2': '0px 4px 12px rgba(0, 0, 0, 0.08), 0px 2px 4px rgba(0, 0, 0, 0.06)',
        'level-3': '0px 20px 40px rgba(0, 0, 0, 0.12), 0px 8px 16px rgba(0, 0, 0, 0.08)',
      },
      screens: {
        'xs': '375px',
        'sm': '390px',
        'md': '768px',
      }
    },
  },
  plugins: [],
}
