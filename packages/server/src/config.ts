/**
 * Server configuration with sensible defaults.
 */

export interface ServerConfig {
  /** Server port */
  port: number;
  /** Server hostname */
  host: string;
  /** Base URL for resource IRIs */
  baseUrl: string;
  /** CORS origins */
  corsOrigins: string[];
  /** Rate limit window (ms) */
  rateLimitWindowMs: number;
  /** Rate limit max requests per window */
  rateLimitMax: number;
  /** Enable request logging */
  enableLogging: boolean;
  /** Log level */
  logLevel: string;
  /** Enable Helmet security headers */
  enableHelmet: boolean;
  /** Enable compression */
  enableCompression: boolean;
  /** Node environment */
  nodeEnv: string;
  /** Storage backend: "memory" | "file" */
  storageBackend: "memory" | "file";
  /** File storage directory (when storageBackend is "file") */
  storageDir: string;
}

export function loadConfig(): ServerConfig {
  return {
    port: parseInt(process.env.PORT || "3001"),
    host: process.env.HOST || "0.0.0.0",
    baseUrl: process.env.BASE_URL || "http://localhost:3001",
    corsOrigins: (process.env.CORS_ORIGINS || "*").split(","),
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000"),
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || "100"),
    enableLogging: process.env.ENABLE_LOGGING !== "false",
    logLevel: process.env.LOG_LEVEL || "info",
    enableHelmet: process.env.ENABLE_HELMET !== "false",
    enableCompression: process.env.ENABLE_COMPRESSION !== "false",
    nodeEnv: process.env.NODE_ENV || "development",
    storageBackend: (process.env.STORAGE_BACKEND as "memory" | "file") || "memory",
    storageDir: process.env.STORAGE_DIR || "./data",
  };
}
