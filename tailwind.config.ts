import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        dash: {
          blue: '#008DE4',
          dark: '#1E1E1E',
          gray: '#333333',
        },
      },
    },
  },
  plugins: [],
};

export default config;