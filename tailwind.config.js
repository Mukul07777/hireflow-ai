/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        brand: {
          50: '#EEEDFE', 100: '#CECBF6', 200: '#AFA9EC',
          400: '#7F77DD', 600: '#534AB7', 800: '#3C3489', 900: '#26215C',
        },
        surface: { DEFAULT: '#FFFFFF', secondary: '#F7F6F3', tertiary: '#F0EEE8' },
        ink: { primary: '#1C1C1A', secondary: '#5F5E5A', tertiary: '#888780' },
        success: { bg: '#E1F5EE', border: '#9FE1CB', text: '#085041', strong: '#1D9E75' },
        warn: { bg: '#FAEEDA', border: '#FAC775', text: '#633806', strong: '#BA7517' },
        danger: { bg: '#FAECE7', border: '#F5C4B3', text: '#712B13', strong: '#D85A30' },
      },
      borderRadius: { DEFAULT: '8px', md: '10px', lg: '12px', xl: '16px', '2xl': '20px' },
      boxShadow: {
        card: '0 1px 4px rgba(28,28,26,0.06), 0 0 0 1px rgba(28,28,26,0.05)',
        elevated: '0 4px 20px rgba(28,28,26,0.10), 0 0 0 1px rgba(28,28,26,0.06)',
        modal: '0 20px 60px rgba(28,28,26,0.18), 0 0 0 1px rgba(28,28,26,0.08)',
      },
      animation: {
        pulse: 'pulse 1.2s ease-in-out infinite',
        spin: 'spin 0.7s linear infinite',
        fadeIn: 'fadeIn 0.3s ease',
        slideUp: 'slideUp 0.35s ease',
        shimmer: 'shimmer 1.6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideUp: { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        shimmer: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } },
      }
    }
  },
  plugins: []
}
