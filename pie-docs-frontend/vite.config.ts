/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3001,
    host: true,
    open: true,
    strictPort: true,
    hmr: {
      overlay: true,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  css: {
    devSourcemap: true,
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
  },
  build: {
    target: 'es2015',
    minify: 'esbuild',
    sourcemap: false,
    cssCodeSplit: true,
    modulePreload: {
      polyfill: true,
    },
    rollupOptions: {
      treeshake: {
        preset: 'recommended',
        moduleSideEffects: 'no-external',
      },
      output: {
        manualChunks: (id) => {
          // React core libraries
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }

          // Redux and state management
          if (id.includes('node_modules/@reduxjs/toolkit') || id.includes('node_modules/react-redux')) {
            return 'vendor-redux';
          }

          // Router
          if (id.includes('node_modules/react-router-dom')) {
            return 'vendor-router';
          }

          // Heavy PDF libraries (only loaded when needed)
          if (id.includes('node_modules/pdfjs-dist') || id.includes('node_modules/react-pdf')) {
            return 'vendor-pdf';
          }

          // OpenCV (very large, only loaded when needed)
          if (id.includes('node_modules/@techstark/opencv-js')) {
            return 'vendor-opencv';
          }

          // Map libraries (only loaded on physical docs page)
          if (id.includes('node_modules/leaflet') || id.includes('node_modules/react-leaflet')) {
            return 'vendor-maps';
          }

          // Excel/document generation libraries
          if (id.includes('node_modules/exceljs') || id.includes('node_modules/jspdf') || id.includes('node_modules/jszip')) {
            return 'vendor-document-gen';
          }

          // QR/Barcode libraries
          if (id.includes('node_modules/qrcode') || id.includes('node_modules/jsbarcode') || id.includes('node_modules/@zxing')) {
            return 'vendor-barcode';
          }

          // Charts and data visualization
          if (id.includes('node_modules/recharts')) {
            return 'vendor-charts';
          }

          // Drag and drop libraries
          if (id.includes('node_modules/@dnd-kit') || id.includes('node_modules/react-dnd') || id.includes('node_modules/react-grid-layout')) {
            return 'vendor-dnd';
          }

          // Form libraries
          if (id.includes('node_modules/react-hook-form') || id.includes('node_modules/@hookform') || id.includes('node_modules/zod')) {
            return 'vendor-forms';
          }

          // Animation libraries
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-animation';
          }

          // i18n libraries
          if (id.includes('node_modules/i18next') || id.includes('node_modules/react-i18next')) {
            return 'vendor-i18n';
          }

          // UI component libraries
          if (id.includes('node_modules/@headlessui') || id.includes('node_modules/@heroicons')) {
            return 'vendor-ui';
          }

          // Other third-party libraries
          if (id.includes('node_modules/')) {
            return 'vendor-misc';
          }
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: ({ name }) => {
          if (/\.(gif|jpe?g|png|svg)$/.test(name ?? '')) {
            return 'assets/images/[name]-[hash][extname]';
          }
          if (/\.css$/.test(name ?? '')) {
            return 'assets/css/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    assetsInlineLimit: 4096,
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    reporters: ['verbose'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/',
      ],
    },
  },
})
