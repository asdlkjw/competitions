/**
 * Subscription Usage Statusline Plugin for OpenCode
 *
 * Multi-provider subscription usage tracking:
 * - Claude (Anthropic) - 5h / 7d limits
 * - Codex (OpenAI) - Rate limits
 * - Gemini (Google) - RPM/TPM limits
 * - GLM (ZHIPU) - Usage quotas
 *
 * Reference: https://github.com/uppinote20/claude-dashboard
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
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
  rpm?: RateLimitData;           // Requests per minute
  tpm?: RateLimitData;           // Tokens per minute
  daily?: RateLimitData;         // Daily limit
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
// Constants
// ============================================================

const CACHE_DIR = join(homedir(), '.cache', 'opencode-competition');
const CACHE_FILE = join(CACHE_DIR, 'usage-cache.json');
const DEFAULT_TTL = 60; // seconds

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
// API Fetchers (Mock implementations - replace with real APIs)
// ============================================================

/**
 * Fetch Claude usage from Anthropic OAuth API
 * Real implementation would call: GET /oauth/usage
 */
async function fetchClaudeUsage(): Promise<ProviderUsage> {
  // In real implementation, this would fetch from:
  // https://api.anthropic.com/v1/oauth/usage
  // Headers: Authorization: Bearer <oauth_token>

  // Mock data for demonstration
  // Replace with actual API call in production
  const mockData: ProviderUsage = {
    name: 'Claude',
    icon: '🟣',
    plan: 'max',
    fiveHour: {
      utilization: 35,
      resetsAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
      remaining: 65000,
      limit: 100000,
    },
    sevenDay: {
      utilization: 12,
      resetsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    lastUpdated: new Date().toISOString(),
  };

  return mockData;
}

/**
 * Fetch OpenAI/Codex usage
 * Real implementation would call organization usage API
 */
async function fetchCodexUsage(): Promise<ProviderUsage> {
  // Mock data
  return {
    name: 'Codex',
    icon: '🟢',
    plan: 'pro',
    rpm: {
      utilization: 45,
      resetsAt: new Date(Date.now() + 60 * 1000).toISOString(),
      remaining: 550,
      limit: 1000,
    },
    tpm: {
      utilization: 28,
      resetsAt: new Date(Date.now() + 60 * 1000).toISOString(),
      remaining: 72000,
      limit: 100000,
    },
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Fetch Gemini usage from Google AI API
 */
async function fetchGeminiUsage(): Promise<ProviderUsage> {
  // Mock data
  return {
    name: 'Gemini',
    icon: '🔵',
    plan: 'pro',
    rpm: {
      utilization: 20,
      resetsAt: new Date(Date.now() + 60 * 1000).toISOString(),
      remaining: 80,
      limit: 100,
    },
    daily: {
      utilization: 8,
      resetsAt: new Date(Date.now() + 16 * 60 * 60 * 1000).toISOString(),
    },
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Fetch GLM/ZHIPU usage
 */
async function fetchGLMUsage(): Promise<ProviderUsage> {
  // Mock data
  return {
    name: 'GLM',
    icon: '🟡',
    plan: 'pro',
    daily: {
      utilization: 15,
      resetsAt: new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString(),
      remaining: 85000,
      limit: 100000,
    },
    lastUpdated: new Date().toISOString(),
  };
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

  // 5-hour limit (Claude)
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

  // RPM (Codex, Gemini)
  if (provider.rpm) {
    const { utilization, remaining, limit } = provider.rpm;
    const color = getColorForPercent(utilization);

    if (config.compact) {
      parts.push(`RPM: ${color(`${utilization}%`)}`);
    } else if (remaining !== undefined && limit !== undefined) {
      parts.push(`RPM: ${color(`${remaining}/${limit}`)}`);
    } else {
      parts.push(`RPM: ${color(`${utilization}%`)}`);
    }
  }

  // TPM (Codex)
  if (provider.tpm) {
    const { utilization, remaining, limit } = provider.tpm;
    const color = getColorForPercent(utilization);

    if (config.compact) {
      parts.push(`TPM: ${color(`${utilization}%`)}`);
    } else if (remaining !== undefined && limit !== undefined) {
      const remK = Math.round(remaining / 1000);
      const limK = Math.round(limit / 1000);
      parts.push(`TPM: ${color(`${remK}K/${limK}K`)}`);
    }
  }

  // Daily limit (Gemini, GLM)
  if (provider.daily) {
    const { utilization, resetsAt } = provider.daily;
    const color = getColorForPercent(utilization);

    if (config.showBars) {
      parts.push(`Daily: ${createUsageBar(utilization, 8)} ${color(`${utilization}%`)}`);
    } else {
      parts.push(`Daily: ${color(`${utilization}%`)}`);
    }

    if (config.showTime) {
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
    else if (provider.rpm) mainUsage = provider.rpm.utilization;

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

    // RPM
    if (provider.rpm) {
      const { utilization, remaining, limit, resetsAt } = provider.rpm;
      const color = getColorForPercent(utilization);
      lines.push(`    RPM:       ${createUsageBar(utilization, 20)} ${color(`${utilization}%`)}`);
      if (remaining !== undefined && limit !== undefined) {
        lines.push(pc.dim(`               ${remaining} / ${limit} requests remaining`));
      }
    }

    // TPM
    if (provider.tpm) {
      const { utilization, remaining, limit } = provider.tpm;
      const color = getColorForPercent(utilization);
      lines.push(`    TPM:       ${createUsageBar(utilization, 20)} ${color(`${utilization}%`)}`);
      if (remaining !== undefined && limit !== undefined) {
        const remK = Math.round(remaining / 1000);
        const limK = Math.round(limit / 1000);
        lines.push(pc.dim(`               ${remK}K / ${limK}K tokens remaining`));
      }
    }

    // Daily
    if (provider.daily) {
      const { utilization, resetsAt, remaining, limit } = provider.daily;
      const color = getColorForPercent(utilization);
      lines.push(`    Daily:     ${createUsageBar(utilization, 20)} ${color(`${utilization}%`)}`);
      if (remaining !== undefined && limit !== undefined) {
        lines.push(pc.dim(`               ${remaining.toLocaleString()} / ${limit.toLocaleString()} remaining`));
      }
      lines.push(pc.dim(`               Resets in ${formatTimeRemaining(resetsAt)}`));
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
    version: '1.0.0',

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
