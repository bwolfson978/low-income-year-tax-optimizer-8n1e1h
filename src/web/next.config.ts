import type { Config } from 'next'; // v14.0.0

const nextConfig: Config = {
  // Enable React strict mode for enhanced development and debugging
  reactStrictMode: true,

  // Use SWC for faster minification
  swcMinify: true,

  // Remove X-Powered-By header for security
  poweredByHeader: false,

  // Enable gzip compression
  compress: true,

  // Environment variables accessible in browser
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL as string,
  },

  // Comprehensive security headers configuration
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self'; connect-src 'self' https://*.supabase.co https://*.openai.com;",
          },
        ],
      },
    ];
  },

  // Advanced image optimization configuration
  images: {
    domains: ['localhost', '*.supabase.co'],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 3600,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    loader: 'default',
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "script-src 'none'; frame-src 'none'; sandbox;",
  },

  // Experimental Next.js features configuration
  experimental: {
    serverActions: true,
    serverComponents: true,
    optimizeCss: true,
    scrollRestoration: true,
    legacyBrowsers: false,
  },

  // Compiler optimization settings
  compiler: {
    removeConsole: {
      exclude: ['error', 'warn', 'info'],
    },
  },

  // TypeScript configuration settings
  typescript: {
    ignoreBuildErrors: false,
    tsconfigPath: './tsconfig.json',
  },

  // Vercel Analytics configuration
  analyticsId: process.env.NEXT_PUBLIC_ANALYTICS_ID,
};

export default nextConfig;