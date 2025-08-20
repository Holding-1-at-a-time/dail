import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const localEnv = loadEnv(mode, '.', '.local');
  return {
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.VITE_CLERK_PUBLISHABLE_KEY': JSON.stringify(localEnv.VITE_CLERK_PUBLISHABLE_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      commonjsOptions: {
        include: [/node_modules/],
      },
    },
    ssr: {
      external: [
        '@convex-dev/rag/server',
        '@convex-dev/action-cache/server',
        '@convex-dev/aggregate/server',
        '@convex-dev/agent/server',
        '@convex-dev/rate-limiter/server',
        '@convex-dev/workflow/server',
        '@convex-dev/workpool/server',
      ],
    },
  };
});
