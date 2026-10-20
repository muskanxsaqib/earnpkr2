import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
        manifest: {
          name: 'Earning Hub',
          short_name: 'EarningHub',
          description: 'Earning Hub - Powered by Saqib. Premium Earning Platform.',
          theme_color: '#020617',
          background_color: '#020617',
          display: 'standalone',
          orientation: 'portrait',
          icons: [
            {
              src: 'https://ik.imagekit.io/19imy4f1u/lite_1783801856823_8COA8zmhu.webp',
              sizes: '192x192',
              type: 'image/webp'
            },
            {
              src: 'https://ik.imagekit.io/19imy4f1u/lite_1783801856823_8COA8zmhu.webp',
              sizes: '512x512',
              type: 'image/webp'
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
