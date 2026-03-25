/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#e63946',
          light: '#ff6b6b',
          dark: '#c1121f',
        },
        store: {
          iga: '#e63946',
          maxi: '#f7c59f',
          metro: '#2ec4b6',
          superc: '#ff9f1c',
          costco: '#005daa',
        },
      },
    },
  },
  plugins: [],
}
