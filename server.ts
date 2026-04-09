import express from "express";
console.log("Server file loaded");
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { handleReport } from "./src/services/reportService.ts";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  console.log("Environment check:", {
    NODE_ENV: process.env.NODE_ENV,
    hasToken: !!process.env.GITHUB_FEEDBACK_TOKEN,
    hasOwner: !!process.env.GITHUB_REPO_OWNER,
    hasRepo: !!process.env.GITHUB_REPO_NAME,
    owner: process.env.GITHUB_REPO_OWNER,
    repo: process.env.GITHUB_REPO_NAME
  });

  // Health Check Endpoint
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok",
      environment: process.env.NODE_ENV || 'development',
      config: {
        hasToken: !!process.env.GITHUB_FEEDBACK_TOKEN,
        hasOwner: !!process.env.GITHUB_REPO_OWNER,
        hasRepo: !!process.env.GITHUB_REPO_NAME
      }
    });
  });

  // GitHub Report Endpoint
  app.post("/api/support/report", handleReport);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting Vite in development mode...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: {
          port: 24679 // Use a different port for HMR to avoid conflicts
        }
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite middleware attached.");
  } else {
    console.log("Starting in production mode...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
