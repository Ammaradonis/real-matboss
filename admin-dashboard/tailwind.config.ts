import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        admin: {
          ink: '#f3f1ec',
          bg: '#0e141f',
          surface: '#172131',
          panel: '#223147',
          amber: '#f2b560',
          mint: '#76d3b7',
          sky: '#72b4ff',
          coral: '#ff8f79',
        },
      },
      boxShadow: {
        panel: '0 16px 40px rgba(15, 23, 42, 0.38)',
      },
    },
  },
  plugins: [],
};

export default config;
