import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { handleReport } from './src/services/reportService.ts';
import express from 'express';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'api-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url === '/api/support/report' && req.method === 'POST') {
              console.log('[API] Received feedback report request');
              
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', async () => {
                try {
                  const parsedBody = JSON.parse(body);
                  (req as any).body = parsedBody;
                  
                  // Ensure env vars are available to the handler
                  process.env.GITHUB_FEEDBACK_TOKEN = env.GITHUB_FEEDBACK_TOKEN;
                  process.env.GITHUB_REPO_OWNER = env.GITHUB_REPO_OWNER;
                  process.env.GITHUB_REPO_NAME = env.GITHUB_REPO_NAME;

                  console.log('[API] Calling handleReport...');
                  await handleReport(req, res);
                  console.log('[API] handleReport completed');
                } catch (e) {
                  console.error('[API] Error in middleware:', e);
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Internal Server Error' }));
                }
              });
            } else {
              next();
            }
          });
        }
      }
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
