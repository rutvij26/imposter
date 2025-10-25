/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "dark-bg": "#0f172a",
        "dark-card": "#1e293b",
        "dark-border": "#334155",
      },
    },
  },
  plugins: [],
};
