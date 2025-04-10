export default {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {

        "blue-gradient-from": "#3b82f6",
        "blue-gradient-to": "#2563eb",


        "purple-gradient-from": "#8b5cf6",
        "purple-gradient-to": "#7c3aed",
      },
      animation: {
        "bounce-slow": "bounce 3s ease-in-out infinite",
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      boxShadow: {
        subtle: "0 2px 5px rgba(0, 0, 0, 0.05)",
      },
      sidebar: {
        DEFAULT: "hsl(var(--sidebar-background))",
        foreground: "hsl(var(--sidebar-foreground))",
        primary: "hsl(var(--sidebar-primary))",
        "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
        accent: "hsl(var(--sidebar-accent))",
        "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
        border: "hsl(var(--sidebar-border))",
        ring: "hsl(var(--sidebar-ring))",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
  future: {
    hoverOnlyWhenSupported: true,
    respectDefaultRingColorOpacity: true,
    disableColorOpacityUtilitiesByDefault: true,
    purgeLayersByDefault: true,
  },
};
