/**
 * Production entry point for Fly.io deployment.
 * Serves both the API and static frontend from a single Express server on port 8080.
 */
import path from "path";
import express from "express";
import { fileURLToPath } from "url";
import { loadConfig } from "../packages/server/dist/config.js";
import { createApp } from "../packages/server/dist/app.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const config = loadConfig();
  // Override port to 8080 for Fly.io
  config.port = parseInt(process.env.PORT || "8080", 10);

  console.log(`
╔══════════════════════════════════════════════════════╗
║         HyprCAT Gateway Server v1.0                  ║
║  Hypermedia Context & Action Transfer Protocol       ║
╚══════════════════════════════════════════════════════╝
  `);

  const { app } = await createApp(config);

  // Serve static frontend files
  const staticDir = path.resolve(__dirname, "../static");
  app.use(express.static(staticDir, {
    maxAge: "1y",
    immutable: true,
  }));

  // SPA fallback - serve index.html for unmatched routes
  app.get("*", (req, res) => {
    res.sendFile(path.join(staticDir, "index.html"));
  });

  app.listen(config.port, config.host, () => {
    console.log(`[HyprCAT] Gateway listening on ${config.host}:${config.port}`);
    console.log(`[HyprCAT] Static files from: ${staticDir}`);
    console.log(`[HyprCAT] Health: http://localhost:${config.port}/health`);
    console.log(`[HyprCAT] Environment: ${config.nodeEnv}`);
    console.log("");
  });
}

main().catch((err) => {
  console.error("[HyprCAT] Failed to start server:", err);
  process.exit(1);
});
