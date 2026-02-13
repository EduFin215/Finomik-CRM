/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./modules/**/*.{js,ts,jsx,tsx}",
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
          600: '#0B3064',
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
      borderRadius: {
        'card': '12px',
        'card-lg': '16px',
        'card-xl': '20px',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(11 48 100 / 0.06), 0 1px 2px -1px rgb(11 48 100 / 0.06)',
        'dropdown': '0 10px 15px -3px rgb(11 48 100 / 0.08), 0 4px 6px -4px rgb(11 48 100 / 0.06)',
      },
      backdropBlur: {
        'glass': '12px',
      },
    },
  },
  plugins: [],
};
