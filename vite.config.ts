import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/SlideMaster/',
 
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': '/src'
      }
    },
    server: {
      port: 5173,
      host: true
    },
    build: {
      rollupOptions: {
        onwarn(warning, warn) {
          // Suppress all warnings related to problematic packages
          if (warning.code === 'UNRESOLVED_IMPORT' || 
              warning.message?.includes('@daybrush/utils') ||
              warning.message?.includes('Cannot add property') ||
              warning.message?.includes('object is not extensible')) {
            return;
          }
          warn(warning);
        },
        // More aggressive fix for @daybrush/utils compatibility
        preserveEntrySignatures: 'strict',
        treeshake: {
          preset: 'smallest',
          propertyReadSideEffects: false,
          tryCatchDeoptimization: false
        },
        output: {
          format: 'es',
          manualChunks: (id) => {
            // Isolate problematic packages
            if (id.includes('@daybrush')) {
              return 'daybrush';
            }
            if (id.includes('react-moveable')) {
              return 'moveable';
            }
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          }
        },
        external: (id) => {
          // Don't try to bundle problematic internal dependencies
          return false;
        }
      }
    }
  }
})