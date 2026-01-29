import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => {
  // depending on your application, base can also be "/"
  const env = loadEnv(mode, process.cwd(), '');
  const API_URL = `${env.VITE_APP_BASE_NAME}`;
  const PORT = 3331;

  return {
    server: {
      // this ensures that the browser opens upon server start
      open: true,
      // this sets a default port to 3331
      port: PORT,
      host: true
    },
    build: {
      chunkSizeWarningLimit: 1600,
      commonjsOptions: {
        transformMixedEsModules: true
      }
    },
    preview: {
      open: true,
      host: true
    },
    define: {
      global: 'window',
      // Compatibility for libraries accessing process.env
      'process.env': env
    },
    resolve: {
      alias: {
        // { find: '', replacement: path.resolve(__dirname, 'src') },
        // {
        //   find: /^~(.+)/,
        //   replacement: path.join(process.cwd(), 'node_modules/$1')
        // },
        // {
        //   find: /^src(.+)/,
        //   replacement: path.join(process.cwd(), 'src/$1')
        // }
        // {
        //   find: 'assets',
        //   replacement: path.join(process.cwd(), 'src/assets')
        // },
        '@tabler/icons-react': '@tabler/icons-react/dist/esm/icons/index.mjs'
      }
    },
    base: API_URL,
    plugins: [
      react(),
      tsconfigPaths(),
      visualizer({
        open: true, // This will automatically open the chart in your browser after build
        filename: 'stats.html',
        gzipSize: true,
        brotliSize: true,
      })
    ]
  };
});
