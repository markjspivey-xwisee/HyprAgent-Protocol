/**
 * @hyprcat/server
 *
 * HyprCAT Gateway Server - serves HyprCAT-compliant resources
 * with governance, provenance, and federation support.
 */

import { loadConfig } from "./config.js";
import { createApp } from "./app.js";

async function main() {
  const config = loadConfig();

  console.log(`
╔══════════════════════════════════════════════════════╗
║         HyprCAT Gateway Server v1.0                  ║
║  Hypermedia Context & Action Transfer Protocol       ║
╚══════════════════════════════════════════════════════╝
  `);

  const { app } = await createApp(config);

  app.listen(config.port, config.host, () => {
    console.log(`[HyprCAT] Gateway listening on ${config.host}:${config.port}`);
    console.log(`[HyprCAT] Base URL: ${config.baseUrl}`);
    console.log(`[HyprCAT] Well-known: ${config.baseUrl}/.well-known/hyprcat`);
    console.log(`[HyprCAT] Catalog: ${config.baseUrl}/catalog`);
    console.log(`[HyprCAT] Health: ${config.baseUrl}/health`);
    console.log(`[HyprCAT] Environment: ${config.nodeEnv}`);
    console.log("");
  });
}

main().catch((err) => {
  console.error("[HyprCAT] Failed to start server:", err);
  process.exit(1);
});

// Re-exports for programmatic usage
export { createApp } from "./app.js";
export { loadConfig } from "./config.js";
export type { ServerConfig } from "./config.js";
export type { StorageProvider } from "./storage/interface.js";
export { MemoryStorage } from "./storage/memory.js";
