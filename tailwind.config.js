/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        "crab-red": "var(--crab-red)",
        "crab-red-dark": "var(--crab-red-dark)",
        "crab-red-soft": "var(--crab-red-soft)",
        "ocean-blue": "var(--ocean-blue)",
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))"
      },
      boxShadow: {
        panel: "0 16px 40px rgba(15, 23, 42, 0.08)"
      }
    }
  },
  plugins: []
};
