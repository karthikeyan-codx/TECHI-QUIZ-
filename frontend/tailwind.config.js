/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        orbitron: ['Orbitron', 'monospace'],
        poppins: ['Poppins', 'sans-serif'],
      },
      colors: {
        neon: {
          blue: '#00d4ff',
          purple: '#bf5af2',
          green: '#30d158',
          pink: '#ff375f',
          yellow: '#ffd60a',
        },
        dark: {
          900: '#050507',
          800: '#0a0a0f',
          700: '#0f0f1a',
          600: '#141425',
          500: '#1a1a30',
          400: '#20203c',
        },
      },
      boxShadow: {
        neon: '0 0 20px rgba(0, 212, 255, 0.5)',
        'neon-purple': '0 0 20px rgba(191, 90, 242, 0.5)',
        'neon-green': '0 0 20px rgba(48, 209, 88, 0.5)',
        'neon-pink': '0 0 20px rgba(255, 55, 95, 0.5)',
        glass: '0 8px 32px rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'pulse-neon': 'pulseNeon 2s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        pulseNeon: {
          '0%, 100%': { textShadow: '0 0 10px #00d4ff, 0 0 20px #00d4ff' },
          '50%': { textShadow: '0 0 20px #00d4ff, 0 0 40px #00d4ff, 0 0 80px #00d4ff' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          from: { boxShadow: '0 0 10px rgba(0, 212, 255, 0.3)' },
          to: { boxShadow: '0 0 30px rgba(0, 212, 255, 0.8), 0 0 60px rgba(191, 90, 242, 0.4)' },
        },
      },
    },
  },
  plugins: [],
}
