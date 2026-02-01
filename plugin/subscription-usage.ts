/**
 * Subscription Usage Statusline Plugin for OpenCode
 *
 * Multi-provider subscription usage tracking:
 * - Claude (Anthropic) - 5h / 7d limits via OAuth API
 * - Codex (OpenAI) - Rate limits via ChatGPT backend API
 * - Gemini (Google) - Quota via Code Assist API
 * - GLM (ZHIPU/Z.ai) - Usage quotas via monitor API
 *
 * Reference: https://github.com/uppinote20/claude-dashboard
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { execSync } from 'child_process';
import pc from 'picocolors';

// ============================================================
// Types
// ============================================================

interface RateLimitData {
  utilization: number;  // 0-100 percentage
  resetsAt: string;     // ISO timestamp
  remaining?: number;   // Remaining tokens/requests
  limit?: number;       // Total limit
}

interface ProviderUsage {
  name: string;
  icon: string;
  plan: 'free' | 'pro' | 'max' | 'enterprise' | 'unknown';
  fiveHour?: RateLimitData;
  sevenDay?: RateLimitData;
  sevenDaySonnet?: RateLimitData;
  primaryWindow?: RateLimitData;   // Codex primary window
  secondaryWindow?: RateLimitData; // Codex secondary window
  rpm?: RateLimitData;             // Requests per minute
  tpm?: RateLimitData;             // Tokens per minute
  daily?: RateLimitData;           // Daily limit
  tokensLimit?: RateLimitData;     // GLM tokens limit
  timeLimit?: RateLimitData;       // GLM time limit
  lastUpdated: string;
  error?: string;
}

interface UsageCache {
  providers: Record<string, ProviderUsage>;
  ttlSeconds: number;
}

interface StatuslineConfig {
  providers: string[];
  showBars: boolean;
  showTime: boolean;
  compact: boolean;
}

// ============================================================
// Auth Credential Types
// ============================================================

interface ClaudeCredentials {
  oauth_token?: string;
  accessToken?: string;
}

interface CodexCredentials {
  accessToken: string;
  accountId: string;
}

interface GeminiCredentials {
  access_token: string;
  refresh_token?: string;
}

interface GLMCredentials {
  authToken: string;
  baseUrl?: string;
}

// ============================================================
// Constants
// ============================================================

const CACHE_DIR = join(homedir(), '.cache', 'opencode-competition');
const CACHE_FILE = join(CACHE_DIR, 'usage-cache.json');
const DEFAULT_TTL = 60; // seconds

// Credential file paths
const CLAUDE_CREDENTIALS_PATH = join(homedir(), '.claude', '.credentials.json');
const CODEX_AUTH_PATH = join(homedir(), '.codex', 'auth.json');
const GEMINI_OAUTH_PATH = join(homedir(), '.gemini', 'oauth_creds.json');
const GLM_CONFIG_PATH = join(homedir(), '.glm', 'config.json');

// API Endpoints
const CLAUDE_USAGE_API = 'https://api.anthropic.com/api/oauth/usage';
const CODEX_USAGE_API = 'https://chatgpt.com/backend-api/wham/usage';
const GEMINI_CODE_ASSIST_ENDPOINT = 'https://cloudcode-pa.googleapis.com';
const GLM_DEFAULT_BASE_URL = 'https://open.bigmodel.cn';

const PROVIDER_ICONS: Record<string, string> = {
  claude: '🟣',
  codex: '🟢',
  openai: '🟢',
  gemini: '🔵',
  glm: '🟡',
  zhipu: '🟡',
};

const DEFAULT_CONFIG: StatuslineConfig = {
  providers: ['claude', 'codex', 'gemini', 'glm'],
  showBars: true,
  showTime: true,
  compact: false,
};

const PLUGIN_VERSION = '1.0.0';

// ============================================================
// Cache Management
// ============================================================

function ensureCacheDir(): void {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function loadCache(): UsageCache {
  ensureCacheDir();
  if (existsSync(CACHE_FILE)) {
    try {
      return JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
    } catch {
      // Return empty cache on error
    }
  }
  return { providers: {}, ttlSeconds: DEFAULT_TTL };
}

function saveCache(cache: UsageCache): void {
  ensureCacheDir();
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

function isCacheValid(provider: ProviderUsage, ttlSeconds: number): boolean {
  if (!provider.lastUpdated) return false;
  const age = Date.now() - new Date(provider.lastUpdated).getTime();
  return age < ttlSeconds * 1000;
}

// ============================================================
// Credential Loading
// ============================================================

function loadClaudeCredentials(): ClaudeCredentials | null {
  // Try credentials file first
  if (existsSync(CLAUDE_CREDENTIALS_PATH)) {
    try {
      const creds = JSON.parse(readFileSync(CLAUDE_CREDENTIALS_PATH, 'utf-8'));
      if (creds.oauth_token || creds.accessToken) {
        return creds;
      }
    } catch {}
  }

  // Try macOS keychain
  if (process.platform === 'darwin') {
    try {
      const token = execSync(
        'security find-generic-password -s "claude.ai" -w 2>/dev/null',
        { encoding: 'utf-8' }
      ).trim();
      if (token) {
        return { oauth_token: token };
      }
    } catch {}
  }

  // Try environment variable
  const envToken = process.env.ANTHROPIC_AUTH_TOKEN;
  if (envToken) {
    return { oauth_token: envToken };
  }

  return null;
}

function loadCodexCredentials(): CodexCredentials | null {
  if (existsSync(CODEX_AUTH_PATH)) {
    try {
      const auth = JSON.parse(readFileSync(CODEX_AUTH_PATH, 'utf-8'));
      if (auth.accessToken && auth.accountId) {
        return auth;
      }
    } catch {}
  }

  // Try environment variables
  const accessToken = process.env.OPENAI_ACCESS_TOKEN;
  const accountId = process.env.OPENAI_ACCOUNT_ID;
  if (accessToken && accountId) {
    return { accessToken, accountId };
  }

  return null;
}

function loadGeminiCredentials(): GeminiCredentials | null {
  if (existsSync(GEMINI_OAUTH_PATH)) {
    try {
      const creds = JSON.parse(readFileSync(GEMINI_OAUTH_PATH, 'utf-8'));
      if (creds.access_token) {
        return creds;
      }
    } catch {}
  }

  // Try macOS keychain for Google OAuth
  if (process.platform === 'darwin') {
    try {
      const token = execSync(
        'security find-generic-password -s "gemini.google.com" -w 2>/dev/null',
        { encoding: 'utf-8' }
      ).trim();
      if (token) {
        return { access_token: token };
      }
    } catch {}
  }

  // Try environment variable
  const envToken = process.env.GEMINI_ACCESS_TOKEN;
  if (envToken) {
    return { access_token: envToken };
  }

  return null;
}

function loadGLMCredentials(): GLMCredentials | null {
  if (existsSync(GLM_CONFIG_PATH)) {
    try {
      const config = JSON.parse(readFileSync(GLM_CONFIG_PATH, 'utf-8'));
      if (config.authToken || config.api_key) {
        return {
          authToken: config.authToken || config.api_key,
          baseUrl: config.baseUrl || config.base_url,
        };
      }
    } catch {}
  }

  // Try environment variables
  const authToken = process.env.GLM_AUTH_TOKEN || process.env.ZHIPU_API_KEY;
  if (authToken) {
    return {
      authToken,
      baseUrl: process.env.GLM_BASE_URL,
    };
  }

  return null;
}

// ============================================================
// API Fetchers
// ============================================================

/**
 * Fetch Claude usage from Anthropic OAuth API
 * Endpoint: https://api.anthropic.com/api/oauth/usage
 */
async function fetchClaudeUsage(): Promise<ProviderUsage> {
  const creds = loadClaudeCredentials();

  if (!creds) {
    return {
      name: 'Claude',
      icon: '🟣',
      plan: 'unknown',
      lastUpdated: new Date().toISOString(),
      error: 'No credentials found (~/.claude/.credentials.json)',
    };
  }

  const token = creds.oauth_token || creds.accessToken;

  try {
    const response = await fetch(CLAUDE_USAGE_API, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': `opencode-competition/${PLUGIN_VERSION}`,
        'Authorization': `Bearer ${token}`,
        'anthropic-beta': 'oauth-2025-04-20',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    const result: ProviderUsage = {
      name: 'Claude',
      icon: '🟣',
      plan: data.plan || 'unknown',
      lastUpdated: new Date().toISOString(),
    };

    // Parse 5-hour limit
    if (data.five_hour) {
      result.fiveHour = {
        utilization: Math.round(data.five_hour.utilization || 0),
        resetsAt: data.five_hour.resets_at || new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
      };
    }

    // Parse 7-day limit (Max plan only)
    if (data.seven_day) {
      result.sevenDay = {
        utilization: Math.round(data.seven_day.utilization || 0),
        resetsAt: data.seven_day.resets_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
      result.plan = 'max';
    }

    // Parse 7-day Sonnet limit (Max plan)
    if (data.seven_day_sonnet) {
      result.sevenDaySonnet = {
        utilization: Math.round(data.seven_day_sonnet.utilization || 0),
        resetsAt: data.seven_day_sonnet.resets_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
    }

    return result;
  } catch (error) {
    return {
      name: 'Claude',
      icon: '🟣',
      plan: 'unknown',
      lastUpdated: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Failed to fetch',
    };
  }
}

/**
 * Fetch OpenAI/Codex usage from ChatGPT backend API
 * Endpoint: https://chatgpt.com/backend-api/wham/usage
 */
async function fetchCodexUsage(): Promise<ProviderUsage> {
  const creds = loadCodexCredentials();

  if (!creds) {
    return {
      name: 'Codex',
      icon: '🟢',
      plan: 'unknown',
      lastUpdated: new Date().toISOString(),
      error: 'No credentials found (~/.codex/auth.json)',
    };
  }

  try {
    const response = await fetch(CODEX_USAGE_API, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${creds.accessToken}`,
        'ChatGPT-Account-Id': creds.accountId,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    const result: ProviderUsage = {
      name: 'Codex',
      icon: '🟢',
      plan: data.plan || 'pro',
      lastUpdated: new Date().toISOString(),
    };

    // Parse rate limits
    if (data.rate_limit) {
      // Primary window (usually 3 hours)
      if (data.rate_limit.primary_window) {
        result.primaryWindow = {
          utilization: Math.round(data.rate_limit.primary_window.used_percent || 0),
          resetsAt: data.rate_limit.primary_window.reset_at || new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        };
        // Map to fiveHour for compatibility
        result.fiveHour = result.primaryWindow;
      }

      // Secondary window (usually 24 hours)
      if (data.rate_limit.secondary_window) {
        result.secondaryWindow = {
          utilization: Math.round(data.rate_limit.secondary_window.used_percent || 0),
          resetsAt: data.rate_limit.secondary_window.reset_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        };
        // Map to daily for compatibility
        result.daily = result.secondaryWindow;
      }
    }

    return result;
  } catch (error) {
    return {
      name: 'Codex',
      icon: '🟢',
      plan: 'unknown',
      lastUpdated: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Failed to fetch',
    };
  }
}

/**
 * Fetch Gemini usage from Google Code Assist API
 * Uses two-step process: loadCodeAssist -> retrieveUserQuota
 */
async function fetchGeminiUsage(): Promise<ProviderUsage> {
  const creds = loadGeminiCredentials();

  if (!creds) {
    return {
      name: 'Gemini',
      icon: '🔵',
      plan: 'unknown',
      lastUpdated: new Date().toISOString(),
      error: 'No credentials found (~/.gemini/oauth_creds.json)',
    };
  }

  try {
    // Step 1: Load Code Assist to get project info
    const loadResponse = await fetch(`${GEMINI_CODE_ASSIST_ENDPOINT}/v1internal:loadCodeAssist`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${creds.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!loadResponse.ok) {
      throw new Error(`HTTP ${loadResponse.status}: ${loadResponse.statusText}`);
    }

    // Step 2: Retrieve user quota
    const quotaResponse = await fetch(`${GEMINI_CODE_ASSIST_ENDPOINT}/v1internal:retrieveUserQuota`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${creds.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!quotaResponse.ok) {
      throw new Error(`HTTP ${quotaResponse.status}: ${quotaResponse.statusText}`);
    }

    const data = await quotaResponse.json();

    const result: ProviderUsage = {
      name: 'Gemini',
      icon: '🔵',
      plan: 'pro',
      lastUpdated: new Date().toISOString(),
    };

    // Parse buckets
    if (data.buckets && Array.isArray(data.buckets)) {
      for (const bucket of data.buckets) {
        const utilization = Math.round((1 - (bucket.remainingFraction || 0)) * 100);
        const resetsAt = bucket.resetTime || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        // Use first bucket as daily quota
        if (!result.daily) {
          result.daily = { utilization, resetsAt };
        }
      }
    }

    return result;
  } catch (error) {
    return {
      name: 'Gemini',
      icon: '🔵',
      plan: 'unknown',
      lastUpdated: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Failed to fetch',
    };
  }
}

/**
 * Fetch GLM/ZHIPU usage from Z.ai monitor API
 * Endpoint: {baseUrl}/api/monitor/usage/quota/limit
 */
async function fetchGLMUsage(): Promise<ProviderUsage> {
  const creds = loadGLMCredentials();

  if (!creds) {
    return {
      name: 'GLM',
      icon: '🟡',
      plan: 'unknown',
      lastUpdated: new Date().toISOString(),
      error: 'No credentials found (~/.glm/config.json or GLM_AUTH_TOKEN)',
    };
  }

  const baseUrl = creds.baseUrl || GLM_DEFAULT_BASE_URL;

  try {
    const response = await fetch(`${baseUrl}/api/monitor/usage/quota/limit`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${creds.authToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    const result: ProviderUsage = {
      name: 'GLM',
      icon: '🟡',
      plan: 'pro',
      lastUpdated: new Date().toISOString(),
    };

    // Parse limits from response
    if (data.data && data.data.limits && Array.isArray(data.data.limits)) {
      for (const limit of data.data.limits) {
        const currentValue = limit.currentValue || 0;
        const maxValue = limit.maxValue || 100;
        const utilization = Math.round((currentValue / maxValue) * 100);
        const resetsAt = limit.nextResetTime || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        if (limit.type === 'TOKENS_LIMIT') {
          result.tokensLimit = {
            utilization,
            resetsAt,
            remaining: maxValue - currentValue,
            limit: maxValue,
          };
          // Map to daily for compatibility
          result.daily = result.tokensLimit;
        } else if (limit.type === 'TIME_LIMIT') {
          result.timeLimit = {
            utilization,
            resetsAt,
          };
        }
      }
    }

    return result;
  } catch (error) {
    return {
      name: 'GLM',
      icon: '🟡',
      plan: 'unknown',
      lastUpdated: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Failed to fetch',
    };
  }
}

const FETCHERS: Record<string, () => Promise<ProviderUsage>> = {
  claude: fetchClaudeUsage,
  codex: fetchCodexUsage,
  openai: fetchCodexUsage,
  gemini: fetchGeminiUsage,
  glm: fetchGLMUsage,
  zhipu: fetchGLMUsage,
};

// ============================================================
// Progress Bar Rendering
// ============================================================

function getColorForPercent(percent: number): (s: string) => string {
  if (percent <= 50) return pc.green;
  if (percent <= 80) return pc.yellow;
  return pc.red;
}

function createUsageBar(percent: number, width: number = 10): string {
  const filled = Math.round(width * (percent / 100));
  const empty = width - filled;
  const color = getColorForPercent(percent);

  return color('█'.repeat(filled)) + pc.dim('░'.repeat(empty));
}

function formatTimeRemaining(resetsAt: string): string {
  const resetTime = new Date(resetsAt).getTime();
  const now = Date.now();
  const diffMs = resetTime - now;

  if (diffMs <= 0) return 'now';

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// ============================================================
// Statusline Rendering
// ============================================================

function renderProviderUsage(
  provider: ProviderUsage,
  config: StatuslineConfig
): string {
  const parts: string[] = [];

  // Provider icon and name
  parts.push(`${provider.icon} ${pc.bold(provider.name)}`);

  // 5-hour limit (Claude, Codex primary window)
  if (provider.fiveHour) {
    const { utilization, resetsAt } = provider.fiveHour;
    const color = getColorForPercent(utilization);

    if (config.showBars) {
      parts.push(`5h: ${createUsageBar(utilization)} ${color(`${utilization}%`)}`);
    } else {
      parts.push(`5h: ${color(`${utilization}%`)}`);
    }

    if (config.showTime) {
      parts.push(pc.dim(`(${formatTimeRemaining(resetsAt)})`));
    }
  }

  // 7-day limit (Claude Max)
  if (provider.sevenDay && provider.plan === 'max') {
    const { utilization, resetsAt } = provider.sevenDay;
    const color = getColorForPercent(utilization);

    if (config.showBars) {
      parts.push(`7d: ${createUsageBar(utilization, 8)} ${color(`${utilization}%`)}`);
    } else {
      parts.push(`7d: ${color(`${utilization}%`)}`);
    }

    if (config.showTime) {
      parts.push(pc.dim(`(${formatTimeRemaining(resetsAt)})`));
    }
  }

  // Daily limit (Gemini, GLM, Codex secondary window)
  if (provider.daily) {
    const { utilization, resetsAt, remaining, limit } = provider.daily;
    const color = getColorForPercent(utilization);

    if (config.showBars) {
      parts.push(`Daily: ${createUsageBar(utilization, 8)} ${color(`${utilization}%`)}`);
    } else {
      parts.push(`Daily: ${color(`${utilization}%`)}`);
    }

    if (config.showTime && resetsAt) {
      parts.push(pc.dim(`(${formatTimeRemaining(resetsAt)})`));
    }
  }

  // Error state
  if (provider.error) {
    parts.push(pc.red(`⚠ ${provider.error}`));
  }

  return parts.join(' ');
}

export function renderUsageStatusline(
  cache: UsageCache,
  config: Partial<StatuslineConfig> = {}
): string {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const lines: string[] = [];

  for (const providerName of cfg.providers) {
    const provider = cache.providers[providerName.toLowerCase()];
    if (provider && !provider.error) {
      lines.push(renderProviderUsage(provider, cfg));
    }
  }

  if (lines.length === 0) {
    return pc.dim('No usage data available');
  }

  return lines.join(pc.dim(' │ '));
}

export function renderCompactUsage(cache: UsageCache): string {
  const parts: string[] = [];

  for (const [name, provider] of Object.entries(cache.providers)) {
    if (provider.error) continue;

    let mainUsage = 0;
    if (provider.fiveHour) mainUsage = provider.fiveHour.utilization;
    else if (provider.daily) mainUsage = provider.daily.utilization;
    else if (provider.sevenDay) mainUsage = provider.sevenDay.utilization;

    const color = getColorForPercent(mainUsage);
    parts.push(`${provider.icon}${color(`${mainUsage}%`)}`);
  }

  return parts.join(' ');
}

// ============================================================
// Full Usage Dashboard
// ============================================================

export function renderUsageDashboard(cache: UsageCache): string {
  const lines: string[] = [];
  const width = 55;
  const border = pc.magenta('━'.repeat(width));

  lines.push('');
  lines.push(border);
  lines.push(pc.bold(pc.magenta('  📈 SUBSCRIPTION USAGE DASHBOARD')));
  lines.push(border);

  if (Object.keys(cache.providers).length === 0) {
    lines.push('');
    lines.push(pc.dim('  No provider usage data available.'));
    lines.push(pc.dim('  Run /usage to fetch current usage.'));
    lines.push('');
    lines.push(border);
    return lines.join('\n');
  }

  for (const [name, provider] of Object.entries(cache.providers)) {
    lines.push('');
    lines.push(pc.bold(`  ${provider.icon} ${provider.name}`));
    lines.push(pc.dim(`    Plan: ${provider.plan.toUpperCase()}`));

    // 5-hour limit
    if (provider.fiveHour) {
      const { utilization, resetsAt, remaining, limit } = provider.fiveHour;
      const color = getColorForPercent(utilization);
      lines.push(`    5h Limit:  ${createUsageBar(utilization, 20)} ${color(`${utilization}%`)}`);
      if (remaining !== undefined && limit !== undefined) {
        lines.push(pc.dim(`               ${remaining.toLocaleString()} / ${limit.toLocaleString()} tokens remaining`));
      }
      lines.push(pc.dim(`               Resets in ${formatTimeRemaining(resetsAt)}`));
    }

    // 7-day limit
    if (provider.sevenDay && provider.plan === 'max') {
      const { utilization, resetsAt } = provider.sevenDay;
      const color = getColorForPercent(utilization);
      lines.push(`    7d Limit:  ${createUsageBar(utilization, 20)} ${color(`${utilization}%`)}`);
      lines.push(pc.dim(`               Resets in ${formatTimeRemaining(resetsAt)}`));
    }

    // 7-day Sonnet limit
    if (provider.sevenDaySonnet && provider.plan === 'max') {
      const { utilization, resetsAt } = provider.sevenDaySonnet;
      const color = getColorForPercent(utilization);
      lines.push(`    7d Sonnet: ${createUsageBar(utilization, 20)} ${color(`${utilization}%`)}`);
      lines.push(pc.dim(`               Resets in ${formatTimeRemaining(resetsAt)}`));
    }

    // Daily limit
    if (provider.daily) {
      const { utilization, resetsAt, remaining, limit } = provider.daily;
      const color = getColorForPercent(utilization);
      lines.push(`    Daily:     ${createUsageBar(utilization, 20)} ${color(`${utilization}%`)}`);
      if (remaining !== undefined && limit !== undefined) {
        lines.push(pc.dim(`               ${remaining.toLocaleString()} / ${limit.toLocaleString()} remaining`));
      }
      if (resetsAt) {
        lines.push(pc.dim(`               Resets in ${formatTimeRemaining(resetsAt)}`));
      }
    }

    // Last updated
    if (provider.lastUpdated) {
      const ago = Math.round((Date.now() - new Date(provider.lastUpdated).getTime()) / 1000);
      lines.push(pc.dim(`    Updated: ${ago}s ago`));
    }

    // Error
    if (provider.error) {
      lines.push(pc.red(`    ⚠ Error: ${provider.error}`));
    }
  }

  lines.push('');
  lines.push(border);
  lines.push('');

  return lines.join('\n');
}

// ============================================================
// Main API
// ============================================================

export async function refreshUsage(
  providers: string[] = DEFAULT_CONFIG.providers
): Promise<UsageCache> {
  const cache = loadCache();

  for (const providerName of providers) {
    const key = providerName.toLowerCase();
    const fetcher = FETCHERS[key];

    if (!fetcher) {
      cache.providers[key] = {
        name: providerName,
        icon: PROVIDER_ICONS[key] || '⚪',
        plan: 'unknown',
        lastUpdated: new Date().toISOString(),
        error: 'Unknown provider',
      };
      continue;
    }

    // Check cache validity
    const cached = cache.providers[key];
    if (cached && isCacheValid(cached, cache.ttlSeconds)) {
      continue; // Use cached data
    }

    try {
      cache.providers[key] = await fetcher();
    } catch (error) {
      cache.providers[key] = {
        name: providerName,
        icon: PROVIDER_ICONS[key] || '⚪',
        plan: 'unknown',
        lastUpdated: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Failed to fetch',
      };
    }
  }

  saveCache(cache);
  return cache;
}

export function getUsage(): UsageCache {
  return loadCache();
}

// ============================================================
// Plugin Export
// ============================================================

export default function subscriptionUsagePlugin(context: any) {
  const directory = context?.directory || process.cwd();

  return {
    name: 'subscription-usage',
    version: PLUGIN_VERSION,

    statusline: {
      /**
       * Render compact usage in statusline
       */
      render: () => {
        const cache = loadCache();
        return renderCompactUsage(cache);
      },

      /**
       * Render full statusline with all providers
       */
      renderFull: () => {
        const cache = loadCache();
        return renderUsageStatusline(cache);
      },

      /**
       * Render full dashboard
       */
      renderDashboard: () => {
        const cache = loadCache();
        return renderUsageDashboard(cache);
      },
    },

    // Export functions for direct use
    exports: {
      refreshUsage,
      getUsage,
      renderUsageStatusline: (config?: Partial<StatuslineConfig>) => {
        const cache = loadCache();
        return renderUsageStatusline(cache, config);
      },
      renderUsageDashboard: () => {
        const cache = loadCache();
        return renderUsageDashboard(cache);
      },
    },
  };
}
