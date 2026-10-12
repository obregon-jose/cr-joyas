import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 950: "#07060a", 900: "#0d0b12", 800: "#14111c", 700: "#1d1928" },
        gold: {
          50: "#fdf8e8",
          100: "#faefc4",
          200: "#f5df8f",
          300: "#e9c85c",
          400: "#d9ae3a",
          500: "#c4932a",
          600: "#a37422",
          700: "#7d5820",
        },
        rose: { gold: "#e8b4a0" },
      },
      fontFamily: {
        serif: ["Cormorant Garamond", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-14px)" },
        },
        spinSlow: {
          to: { transform: "rotate(360deg)" },
        },
        twinkle: {
          "0%,100%": { opacity: "0.15", transform: "scale(0.6)" },
          "50%": { opacity: "1", transform: "scale(1.2)" },
        },
      },
      animation: {
        marquee: "marquee 35s linear infinite",
        shimmer: "shimmer 3s linear infinite",
        float: "float 6s ease-in-out infinite",
        "spin-slow": "spinSlow 40s linear infinite",
        twinkle: "twinkle 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
