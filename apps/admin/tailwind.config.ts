import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#1f6feb', dark: '#0a4ec9' },
      },
    },
  },
  plugins: [],
};

export default config;
