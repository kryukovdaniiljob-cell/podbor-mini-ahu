/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Корпоративная B2B-палитра (референс Rusklimat B2B)
        ink: '#0f172a',         // основной текст
        shaft: '#0d1117',       // тёмная шапка
        paper: '#f4f6f9',       // фон страницы
        sand: '#e2e8f0',        // границы / разделители
        stone: '#64748b',       // вторичный текст
        accent: {
          DEFAULT: '#2f6fb5',   // корпоративный синий — основной акцент
          dark: '#24578f',
        },
        blue: '#3b82f6',
        green: '#2f9e44',       // наличие на складе / рабочая точка
        // совместимость со старыми классами
        brand: { DEFAULT: '#2f6fb5', dark: '#24578f' },
      },
      fontFamily: {
        heading: ['Inter', 'system-ui', 'Arial', 'sans-serif'],
        body: ['Inter', 'system-ui', 'Arial', 'sans-serif'],
        wordmark: ['Oswald', 'Arial Narrow', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(15,23,42,0.04), 0 1px 3px 0 rgba(15,23,42,0.06)',
      },
    },
  },
  plugins: [],
};
