import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 5173,
    host: true,
    strictPort: false,
    hmr: {
      port: 24678
    },
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    },
    middlewareMode: false,
    fs: {
      strict: false
    },
  },
  build: {
    target: 'esnext',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console for debugging
        drop_debugger: true,
        pure_funcs: ['console.log'], // Only remove console.log specifically
        passes: 1 // Reduce optimization passes to prevent dependency issues
      },
      mangle: {
        keep_fnames: true, // Keep function names to prevent initialization issues
        safari10: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core React chunk
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor';
          }

          // Keep Stripe separate, but let Supabase stay in main bundle to prevent init issues
          if (id.includes('@stripe/')) {
            return 'stripe-vendor';
          }

          // Large mapping libraries - separate chunks
          if (id.includes('maplibre-gl')) {
            return 'maplibre-vendor';
          }
          if (id.includes('@turf/') || id.includes('proj4')) {
            return 'geo-vendor';
          }

          // Utility libraries
          if (id.includes('date-fns') || id.includes('lodash')) {
            return 'utils-vendor';
          }

          // Beta features (lazy loaded)
          if (id.includes('/components/analytics/') ||
              id.includes('/components/feedback/') ||
              id.includes('/components/onboarding/') ||
              id.includes('/lib/analytics')) {
            return 'beta-features';
          }

          // Admin features (lazy loaded)
          if (id.includes('/components/admin/')) {
            return 'admin-features';
          }

          // Marketing features (lazy loaded)
          if (id.includes('/components/marketing/')) {
            return 'marketing-features';
          }

          // Help and support features
          if (id.includes('/components/help/')) {
            return 'help-features';
          }

          // Default for other node_modules
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
        chunkFileNames: () => {
          return `assets/[name]-[hash].js`;
        }
      }
    },
    chunkSizeWarningLimit: 400 // Reduced to catch large chunks
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Nurture Hub - Real Estate CRM',
        short_name: 'Nurture Hub',
        description: 'Proximity-based marketing CRM for real estate agents',
        theme_color: '#0d9488',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        maximumFileSizeToCacheInBytes: 3000000,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 1 week
              }
            }
          },
          {
            urlPattern: /^https:\/\/api\.stripe\.com\/.*/i,
            handler: 'NetworkOnly',
            options: {
              cacheName: 'stripe-api-cache'
            }
          },
          {
            urlPattern: /\.(?:png|gif|jpg|jpeg|svg|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          {
            urlPattern: /\.(?:js|css)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources'
            }
          }
        ]
      }
    })
  ],
})
