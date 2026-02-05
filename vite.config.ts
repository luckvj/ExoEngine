import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mkcert from 'vite-plugin-mkcert'
import pkg from './package.json'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    mkcert()
  ],
  define: {
    APP_VERSION: JSON.stringify(pkg.version),
  },
  base: '/',
  build: {
    outDir: 'web/build',
    emptyOutDir: true,
    assetsInlineLimit: 0, // Ensure 4K assets are not inlined as base64
    // Performance optimizations
    minify: 'esbuild',
    cssMinify: true,
    reportCompressedSize: false, // Faster builds
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Optimal code splitting
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'bungie-api': ['bungie-api-ts'],
          'utils': ['dompurify', 'pako', 'papaparse'],
          'markdown': ['react-markdown', 'remark-gfm'],
          // Split large components
          'galaxy': ['src/components/synergy/SynergyGalaxy.tsx'],
          'builder': ['src/components/builder/BuilderContainer.tsx', 'src/components/builder/RichTooltip.tsx'],
        },
        // Asset naming for cache busting
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.');
          const ext = info?.[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext || '')) {
            return `assets/images/[name]-[hash][extname]`;
          } else if (/woff2?|ttf|otf|eot/i.test(ext || '')) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      }
    },
    // Source maps only in dev
    sourcemap: true,
  },
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '/token.php': {
        target: 'https://exoengine.online',
        changeOrigin: true,
        secure: false
      },
      '/dim-proxy.php': {
        target: 'https://exoengine.online',
        changeOrigin: true,
        secure: false
      },
      '/dim-api': {
        target: 'https://api.destinyitemmanager.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/dim-api/, ''),
        secure: false
      },
      '/Platform': {
        target: 'https://www.bungie.net',
        changeOrigin: true,
        secure: false,
        headers: {
          'Origin': 'https://localhost:5174'
        }
      }
    }
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'zustand', 'dompurify'],
    exclude: ['@vite/client', '@vite/env']
  }
})
