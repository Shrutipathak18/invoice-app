/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        invoice: {
          border: '#e5e7eb',
          header: '#f8fafc',
          total: '#fef3c7',
        }
      },
      fontFamily: {
        'invoice': ['Inter', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        'invoice': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      }
    },
  },
  plugins: [],
} 