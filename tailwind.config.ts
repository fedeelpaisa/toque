import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172026",
        muted: "#64717c",
        panel: "#f8faf7"
      }
    }
  },
  plugins: []
};

export default config;
