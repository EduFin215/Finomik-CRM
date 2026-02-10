/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0B3064',
        white: '#FFFFFF',
        brand: {
          100: '#C8D0DD',
          200: '#8F9EB7',
          300: '#5574A7',
          400: '#3E5374',
          500: '#3C4C67',
          600: '#114076',
        },
      },
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
      },
      fontWeight: {
        extrabold: '800',
        bold: '700',
        normal: '400',
      },
    },
  },
  plugins: [],
};
