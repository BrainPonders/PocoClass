/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
        blue: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
        },
        green: {
          50: '#f0fdf4',
          100: '#dcfce7',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
        },
        red: {
          50: '#fef2f2',
          100: '#fee2e2',
          300: '#fca5a5',
          600: '#dc2626',
          800: '#991b1b',
        },
        yellow: {
          100: '#fef3c7',
          500: '#eab308',
          700: '#a16207',
          800: '#854d0e',
        },
        purple: {
          50: '#faf5ff',
          600: '#9333ea',
          900: '#581c87',
        },
      },
    },
  },
  plugins: [],
}