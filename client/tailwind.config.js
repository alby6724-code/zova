/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Modern Classifieds Brand Palette (Deep Blue + Coral Accent)
        brand: {
          primary: "#1b4b8f",
          "primary-hover": "#153c73",
          "primary-light": "#e8f0fe",
          "primary-subtle": "#f0f5fc",
          accent: "#ff5a5f",
          "accent-hover": "#e0484d",
          "accent-light": "#ffeaea",
          success: "#2e7d32",
          "success-light": "#e8f5e9",
          danger: "#d32f2f",
          "danger-light": "#ffebee",
          warning: "#f59e0b",
          "warning-light": "#fffbeb",
          bg: "#f7f8fa",
          surface: "#ffffff",
          border: "#e5e7eb",
          "border-dark": "#cbd5e1",
          textPrimary: "#1a1a1a",
          textSecondary: "#6b7280",
          textMuted: "#9ca3af",
        },
        admin: {
          sidebar: "#0b1a30",
          sidebarHover: "#152846",
          sidebarBorder: "#193154",
          sidebarText: "#94a3b8",
          bg: "#f3f5f9",
          card: "#ffffff",
          cardBorder: "#e2e8f0",
          primary: "#1b4b8f",
          accentBlue: "#1b4b8f",
          accentGreen: "#2e7d32",
          accentOrange: "#ff5a5f",
          accentPurple: "#7c3aed",
          accentRed: "#d32f2f",
          accentTeal: "#0b6e99",
          accentPink: "#ec4899",
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)",
        cardHover: "0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)",
        cta: "0 4px 14px 0 rgba(255, 90, 95, 0.35)",
        primary: "0 4px 14px 0 rgba(27, 75, 143, 0.25)",
      }
    },
  },
  plugins: [],
}
