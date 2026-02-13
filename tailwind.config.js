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
        primary: '#0B3064',    // Deep Navy
        secondary: '#114076',  // Secondary Dark
        'brand-muted': '#3C4C67',
        'brand-mid': '#3E5374',
        accent: '#5574A7',
        soft: '#8F9EB7',
        'very-soft': '#C8D0DD',
        white: '#FFFFFF',
        // Backward compatibility mappings (optional, to avoid immediate breakage)
        brand: {
          100: '#C8D0DD', // very-soft
          200: '#8F9EB7', // soft
          300: '#5574A7', // accent
          400: '#3E5374', // brand-mid
          500: '#3C4C67', // brand-muted
          600: '#0B3064', // primary
        }
      },
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'], // Global default
        title: ['Montserrat', 'sans-serif'],
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
        'card': '0 4px 6px -1px rgb(11 48 100 / 0.08), 0 2px 4px -1px rgb(11 48 100 / 0.04)',
        'card-hover': '0 10px 15px -3px rgb(11 48 100 / 0.1), 0 4px 6px -2px rgb(11 48 100 / 0.05)',
        'dropdown': '0 10px 15px -3px rgb(11 48 100 / 0.1), 0 4px 6px -4px rgb(11 48 100 / 0.06)',
        'glow': '0 0 15px rgba(85, 116, 167, 0.3)', // Accent glow
      },
      backdropBlur: {
        'glass': '12px',
      },
      backgroundImage: {
        'gradient-sidebar': 'linear-gradient(180deg, #0B3064 0%, #114076 100%)',
        'gradient-card': 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
      }
    },
  },
  plugins: [],
};
