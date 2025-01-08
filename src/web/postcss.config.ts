import type { Config } from 'postcss'; // ^8.4.0
import tailwindcss from 'tailwindcss'; // ^3.3.0
import autoprefixer from 'autoprefixer'; // ^10.4.0

const config: Config = {
  plugins: [
    // Tailwind CSS for utility-first styling
    // Processes utility classes and theme settings from tailwind.config.ts
    tailwindcss({
      content: ['./src/**/*.{ts,tsx}'],
      darkMode: ['class'],
      important: true,
    }),

    // Autoprefixer for cross-browser compatibility
    // Adds vendor prefixes to CSS properties
    autoprefixer({
      flexbox: 'no-2009', // Modern flexbox implementation
      grid: 'autoplace', // Enable CSS Grid autoplace support
    }),
  ],

  // Source map configuration for development
  ...(process.env.NODE_ENV === 'development'
    ? {
        map: true,
        sourceMap: true,
      }
    : {
        map: false,
        sourceMap: false,
      }),
};

export default config;