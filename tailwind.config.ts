import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        moto: {
          red: "#C0392B",
          orange: "#E67E22",
          dark: "#1A1A1A",
          charcoal: "#2C2C2C",
          steel: "#3D4E5C",
          tan: "#D4A96A",
          cream: "#F5F0E8",
          smoke: "#8E9BAA",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
