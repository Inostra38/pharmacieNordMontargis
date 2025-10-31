/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  
  content: [
    "./index.html",
    "./catalogue.html",
    "./validation.html",
    "./secure.ordonnance.html",
    "./mentions-legales.html",
    "./politique-confidentialite.html",
    "./assets/js/**/*.js",
  ],
  
  theme: {
    extend: {
      fontFamily: {
        title: ['Poppins', 'sans-serif'],
        body: ['Open Sans', 'sans-serif'],
      },
    },
  },
  
  plugins: [],
}