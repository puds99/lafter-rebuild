/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        stitch: {
          background: '#0F172A', // Deep Space Blue
          surface: '#1E293B',    // Lighter Space Blue
          primary: '#6366F1',    // Electric Indigo
          secondary: '#8B5CF6',  // Electric Purple
          accent: '#38BDF8',     // Sky Blue
          text: '#F8FAFC',       // Starlight White
          muted: '#94A3B8',      // Muted Slate
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
