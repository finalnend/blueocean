/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'ocean-blue': {
          50: '#e6f7ff',
          100: '#b3e5ff',
          200: '#80d4ff',
          300: '#4dc2ff',
          400: '#1ab1ff',
          500: '#0099e6',
          600: '#0077b3',
          700: '#005580',
          800: '#00334d',
          900: '#00111a',
        },
        'earth-green': {
          50: '#e6f7f0',
          100: '#b3e6d1',
          200: '#80d5b2',
          300: '#4dc493',
          400: '#1ab374',
          500: '#009959',
          600: '#007744',
          700: '#00552f',
          800: '#00331a',
          900: '#001105',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
