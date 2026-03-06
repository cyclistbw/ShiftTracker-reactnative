/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Match web app's lime-600 primary colour
        primary: {
          DEFAULT: "#65a30d", // lime-600
          foreground: "#ffffff",
        },
        background: "#f9fafb", // gray-50
        foreground: "#111827",
        muted: {
          DEFAULT: "#f3f4f6",
          foreground: "#6b7280",
        },
        border: "#e5e7eb",
        card: {
          DEFAULT: "#ffffff",
          foreground: "#111827",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff",
        },
      },
    },
  },
  plugins: [],
};
