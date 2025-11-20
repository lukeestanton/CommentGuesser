/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'soviet-red': '#C41E3A',
        'soviet-cream': '#F0EAD6',
        'soviet-charcoal': '#1C1C1C',
      },
      fontFamily: {
        'soviet': ['Anton', 'sans-serif'],
        'body': ['Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

