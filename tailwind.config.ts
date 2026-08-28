import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        andre: "#3b82f6",
        hugo: "#22c55e",
        casa: {
          bg: "#0f172a",
          card: "#1e293b",
          accent: "#f59e0b",
        },
      },
      borderRadius: {
        game: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
