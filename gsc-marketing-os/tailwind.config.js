/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 950: '#060f26', 900: '#0b1b3f', 800: '#13285a', 700: '#1c3672', 600: '#2a4a8f' },
        electric: { DEFAULT: '#1f6bff', 600: '#1557d6', 500: '#1f6bff', 400: '#4d8bff', 100: '#e3edff', 50: '#f1f6ff' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'] },
      boxShadow: { card: '0 1px 2px rgba(11,27,63,.06), 0 1px 8px rgba(11,27,63,.04)' },
    },
  },
  plugins: [],
}
