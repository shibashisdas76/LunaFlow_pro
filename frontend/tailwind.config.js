/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        luna: {
          purple: "#A855F7",
          pink: "#EC4899",
          magenta: "#D946EF",
          soft: "#F5F3FF",
        }
      },
      backgroundImage: {
        'luna-gradient': "linear-gradient(135deg, #A855F7 0%, #EC4899 100%)",
      },
    },
  },
  plugins: [],
}