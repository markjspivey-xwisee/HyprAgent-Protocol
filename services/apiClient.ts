/**
 * API Client Service - connects the frontend to the HyprCAT Gateway server.
 * Falls back to mock data when the server is unavailable.
 */

import type { JsonLdNode, McpPrompt } from '../types';
import { fetchHypermedia as mockFetch, executeHypermediaAction as mockExecute, demoPrompts, MOCK_URLS, serverActions } from './mockHypermedia';

/** API configuration */
interface ApiConfig {
  /** HyprCAT Gateway base URL */
  gatewayUrl: string;
  /** Request timeout (ms) */
  timeout: number;
  /** Agent DID for authentication */
  agentDid?: string;
  /** Session token */
  sessionToken?: string;
}

const DEFAULT_CONFIG: ApiConfig = {
  gatewayUrl: import.meta.env.VITE_GATEWAY_URL || window.location.origin,
  timeout: 15000,
};

let config = { ...DEFAULT_CONFIG };
let isGatewayAvailable: boolean | null = null;

/** Configure the API client */
export function configureApi(overrides: Partial<ApiConfig>): void {
  config = { ...config, ...overrides };
  isGatewayAvailable = null; // Reset availability check
}

/** Check if the gateway server is reachable */
async function checkGatewayAvailability(): Promise<boolean> {
  if (isGatewayAvailable !== null) return isGatewayAvailable;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${config.gatewayUrl}/health`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    clearTimeout(timeoutId);
    isGatewayAvailable = response.ok;
  } catch {
    isGatewayAvailable = false;
  }

  return isGatewayAvailable;
}

/** Translate mock URLs to gateway URLs */
function translateUrl(url: string): string {
  // Map mock domain URLs to gateway paths
  const mappings: Record<string, string> = {
    'https://data.market.example/': `${config.gatewayUrl}/`,
    'https://data.market.example/catalog': `${config.gatewayUrl}/catalog`,
    'https://data.market.example/prompts': `${config.gatewayUrl}/prompts`,
    'https://retail.market.io/api/v1': `${config.gatewayUrl}/nodes/retail`,
    'https://databricks.example/unity-catalog/sales-analytics': `${config.gatewayUrl}/nodes/analytics`,
    'https://learning.io/lrs/telemetry': `${config.gatewayUrl}/nodes/lrs`,
  };

  return mappings[url] || url;
}

/** Fetch a resource (gateway with mock fallback) */
export async function fetchResource(url: string): Promise<JsonLdNode> {
  const gatewayReady = await checkGatewayAvailability();

  if (gatewayReady) {
    try {
      const gatewayUrl = translateUrl(url);
      const response = await fetch(gatewayUrl, {
        headers: {
          Accept: 'application/ld+json, application/json',
          'X-HyprCAT-Version': '1.0',
          ...(config.agentDid ? { 'X-Agent-DID': config.agentDid } : {}),
          ...(config.sessionToken ? { Authorization: `Bearer ${config.sessionToken}` } : {}),
        },
      });

      if (response.ok) {
        return response.json();
      }
    } catch {
      // Fall through to mock
    }
  }

  // Fallback to mock data
  return mockFetch(url);
}

/** Execute an operation (gateway with mock fallback) */
export async function executeOperation(
  url: string,
  method: string,
  body: Record<string, unknown>
): Promise<JsonLdNode> {
  const gatewayReady = await checkGatewayAvailability();

  if (gatewayReady) {
    try {
      const gatewayUrl = translateUrl(url);
      const response = await fetch(gatewayUrl, {
        method,
        headers: {
          'Content-Type': 'application/ld+json',
          Accept: 'application/ld+json, application/json',
          'X-HyprCAT-Version': '1.0',
          ...(config.agentDid ? { 'X-Agent-DID': config.agentDid } : {}),
          ...(config.sessionToken ? { Authorization: `Bearer ${config.sessionToken}` } : {}),
        },
        body: JSON.stringify(body),
      });

      return response.json();
    } catch {
      // Fall through to mock
    }
  }

  // Fallback to mock
  const result = await mockExecute(url, method, body);
  return result;
}

/** Authenticate with the gateway */
export async function authenticate(did: string): Promise<string | null> {
  try {
    // Get challenge
    const challengeRes = await fetch(`${config.gatewayUrl}/auth/challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!challengeRes.ok) return null;
    const challenge = await challengeRes.json();

    // Verify (simplified - in production, sign the challenge)
    const verifyRes = await fetch(`${config.gatewayUrl}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        did,
        signature: 'simulated-sig-' + Date.now(),
        nonce: challenge.nonce,
      }),
    });

    if (!verifyRes.ok) return null;
    const session = await verifyRes.json();

    config.agentDid = did;
    config.sessionToken = session.token;

    return session.token;
  } catch {
    return null;
  }
}

/** Get available URLs (gateway or mock) */
export function getAvailableUrls(): string[] {
  return MOCK_URLS;
}

/** Get demo prompts */
export function getPrompts(): McpPrompt[] {
  return demoPrompts;
}

/** Get wallet info */
export function getWalletInfo() {
  return serverActions.getWalletBalance();
}

/** Reset simulation state */
export function resetSimulation() {
  serverActions.resetSimulation();
}

/** Get gateway connection status */
export function getGatewayStatus(): { connected: boolean; url: string } {
  return {
    connected: isGatewayAvailable === true,
    url: config.gatewayUrl,
  };
}
