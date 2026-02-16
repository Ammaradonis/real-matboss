import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        mat: {
          ink: '#f5efe4',
          bg: '#0c111b',
          surface: '#141c2a',
          panel: '#1a2436',
          gold: '#f0b45a',
          cyan: '#62d0ff',
          rose: '#ff6b82',
          moss: '#7dcc8b',
        },
      },
      boxShadow: {
        aura: '0 10px 30px rgba(98, 208, 255, 0.2)',
      },
    },
  },
  plugins: [],
};

export default config;
