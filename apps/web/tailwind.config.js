const twColors = require("tailwindcss/colors");

/** @type {import('tailwindcss').Config} */
const config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        purple: "#7C3AED",
        blue: "#2563EB",
        gold: "#FBBF24",
        // Keep full emerald scale + DEFAULT so `bg-emerald` and `text-emerald-950` both work
        emerald: {
          ...twColors.emerald,
          DEFAULT: "#10B981",
        },
        pink: "#EC4899",
        ink: "#312E81",
        soft: "#FFFFFF",
        muted: "#6366F1",
        sky: {
          top: "#7DD3FC",
          mid: "#C4B5FD",
          bot: "#FCE7F3",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        game: ["var(--font-game)", "cursive"],
        sans: ["var(--font-game)", "system-ui", "sans-serif"],
      },
      maxWidth: {
        lg: "28rem",
      },
      boxShadow: {
        game: "0 10px 0 rgba(99,102,241,0.12), 0 18px 40px rgba(49,46,129,0.12)",
        "btn-purple": "0 6px 0 rgba(91,33,182,0.85)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

module.exports = config;
