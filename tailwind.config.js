/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        mono: ['"Space Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        paper: {
          DEFAULT: '#FBF3E4',
          100: '#FFFCF5',
          200: '#FBF3E4',
          300: '#F2E6CC',
        },
        ink: {
          DEFAULT: '#211C18',
          soft: '#5d534a',
          faint: '#9a8d7d',
        },
        punch: { DEFAULT: '#FF2E74', soft: '#FFD9E5' },
        tang: { DEFAULT: '#FF7A1A', soft: '#FFE2C9' },
        sun: { DEFAULT: '#FFC400', soft: '#FFF0BF' },
        mint: { DEFAULT: '#12B5A5', soft: '#C7F0EB' },
        sky: { DEFAULT: '#2D8CFF', soft: '#CFE4FF' },
        grape: { DEFAULT: '#7C3AED', soft: '#E4D8FB' },
        lime: { DEFAULT: '#7FBF1F', soft: '#E2F2C4' },
        gold: { DEFAULT: '#F2A900', soft: '#FFE9B0' },
      },
      boxShadow: {
        hard: '4px 4px 0 0 #211C18',
        'hard-sm': '2px 2px 0 0 #211C18',
        'hard-lg': '7px 7px 0 0 #211C18',
        'hard-xl': '11px 11px 0 0 #211C18',
      },
      keyframes: {
        'pop-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0) rotate(-2deg)' },
          '50%': { transform: 'translateY(-7px) rotate(2deg)' },
        },
        wiggle: {
          '0%,100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
      },
      animation: {
        'pop-in': 'pop-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both',
        float: 'float 5s ease-in-out infinite',
        wiggle: 'wiggle 0.5s ease-in-out',
      },
    },
  },
  plugins: [],
}
