/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Cairo', 'Outfit', 'sans-serif'],
      },
      colors: {
        darkBg: '#0f172a',
        darkCard: '#1e293b',
        primaryCyan: '#06b6d4',
      },
    },
  },
  plugins: [],
}
