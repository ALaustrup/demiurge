/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          dark: '#0a0a0f',
          darker: '#050508',
          purple: '#8b5cf6',
          pink: '#ec4899',
          cyan: '#06b6d4',
          neon: '#00ff88',
          glow: '#00ffff',
        },
        primary: {
          50: '#0a0a0f',
          100: '#1a1a2e',
          200: '#16213e',
          300: '#0f3460',
          400: '#533483',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
      },
      fontFamily: {
        cyber: ['Orbitron', 'monospace'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'neon': '0 0 5px #00ff88, 0 0 10px #00ff88, 0 0 15px #00ff88',
        'neon-purple': '0 0 5px #8b5cf6, 0 0 10px #8b5cf6, 0 0 15px #8b5cf6',
        'neon-cyan': '0 0 5px #06b6d4, 0 0 10px #06b6d4, 0 0 15px #06b6d4',
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
        'pulse-neon': 'pulse-neon 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        glow: {
          '0%': { 'box-shadow': '0 0 5px #00ff88, 0 0 10px #00ff88' },
          '100%': { 'box-shadow': '0 0 10px #00ff88, 0 0 20px #00ff88, 0 0 30px #00ff88' },
        },
        'pulse-neon': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.5 },
        },
      },
    },
  },
  plugins: [],
  darkMode: 'class',
};

