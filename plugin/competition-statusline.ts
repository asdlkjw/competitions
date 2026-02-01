/**
 * Competition Statusline Plugin for OpenCode
 *
 * claude-dashboard 스타일의 경진대회 상태 표시 플러그인
 * - 루프 상태 (활성/비활성)
 * - 반복 진행률
 * - 점수 추적 (현재/최고/목표)
 * - 최근 실험 결과
 *
 * Reference: https://github.com/uppinote20/claude-dashboard
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import pc from 'picocolors';

// ============================================================
// Types
// ============================================================

interface LoopState {
  active: boolean;
  iteration: number;
  best_score: number;
  best_iteration: number;
  current_score: number;
  target_score: number | null;
  target_rank: number | null;
  experiments: ExperimentLog[];
  start_time: string;
  metric_direction: 'maximize' | 'minimize';
}

interface ExperimentLog {
  iteration: number;
  timestamp: string;
  cv_score: number;
  lb_score: number | null;
  model: string;
  hypothesis: string;
  result: 'improved' | 'degraded' | 'unchanged';
}

interface StatuslineConfig {
  refresh_ms: number;
  show_score: boolean;
  show_iteration: boolean;
  show_target: boolean;
  show_time: boolean;
  show_trend: boolean;
  compact: boolean;
}

// ============================================================
// Constants
// ============================================================

const STATE_FILE = '.competition-loop-state.json';
const EXPERIMENTS_FILE = 'experiments.jsonl';

const DEFAULT_CONFIG: StatuslineConfig = {
  refresh_ms: 1000,
  show_score: true,
  show_iteration: true,
  show_target: true,
  show_time: true,
  show_trend: true,
  compact: false,
};

// ============================================================
// Progress Bar
// ============================================================

function createProgressBar(
  current: number,
  max: number,
  width: number = 20,
  showPercent: boolean = true
): string {
  const percent = Math.min(current / max, 1);
  const filled = Math.round(width * percent);
  const empty = width - filled;

  // Color based on progress
  let color: (s: string) => string;
  if (percent >= 0.8) {
    color = pc.green;
  } else if (percent >= 0.5) {
    color = pc.yellow;
  } else {
    color = pc.red;
  }

  const bar = color('█'.repeat(filled)) + pc.dim('░'.repeat(empty));
  const percentText = showPercent ? ` ${(percent * 100).toFixed(0)}%` : '';

  return `[${bar}]${percentText}`;
}

function createScoreBar(
  current: number,
  target: number,
  width: number = 15
): string {
  const percent = Math.min(current / target, 1);
  const filled = Math.round(width * percent);
  const empty = width - filled;

  // Color based on how close to target
  let color: (s: string) => string;
  if (percent >= 0.95) {
    color = pc.green;
  } else if (percent >= 0.85) {
    color = pc.yellow;
  } else {
    color = pc.cyan;
  }

  return color('▓'.repeat(filled)) + pc.dim('░'.repeat(empty));
}

// ============================================================
// Trend Analysis
// ============================================================

function getTrendIcon(experiments: ExperimentLog[]): string {
  if (experiments.length < 2) return '➡️';

  const recent = experiments.slice(-5);
  const improvements = recent.filter(e => e.result === 'improved').length;
  const degradations = recent.filter(e => e.result === 'degraded').length;

  if (improvements > degradations) return '📈';
  if (degradations > improvements) return '📉';
  return '➡️';
}

function getTrendText(experiments: ExperimentLog[]): string {
  if (experiments.length < 2) return pc.dim('Baseline');

  const recent = experiments.slice(-5);
  const improvements = recent.filter(e => e.result === 'improved').length;
  const degradations = recent.filter(e => e.result === 'degraded').length;

  if (improvements > degradations) {
    return pc.green('Improving');
  }
  if (degradations > improvements) {
    return pc.red('Degrading');
  }
  return pc.yellow('Plateau');
}

// ============================================================
// Time Formatting
// ============================================================

function formatDuration(startTime: string): string {
  const start = new Date(startTime);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

// ============================================================
// Statusline Rendering
// ============================================================

function loadState(directory: string): LoopState | null {
  const statePath = join(directory, STATE_FILE);
  if (existsSync(statePath)) {
    try {
      return JSON.parse(readFileSync(statePath, 'utf-8'));
    } catch {
      return null;
    }
  }
  return null;
}

function loadExperiments(directory: string): ExperimentLog[] {
  const logPath = join(directory, EXPERIMENTS_FILE);
  if (!existsSync(logPath)) return [];

  try {
    const content = readFileSync(logPath, 'utf-8');
    return content
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));
  } catch {
    return [];
  }
}

export function renderStatusline(
  directory: string,
  config: Partial<StatuslineConfig> = {}
): string {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const state = loadState(directory);
  const experiments = loadExperiments(directory);

  if (!state) {
    return pc.dim('🏃 Competition Loop: Not active');
  }

  const parts: string[] = [];

  // ── Loop Status ──
  if (state.active) {
    parts.push(pc.green('🔄 LOOP'));
  } else {
    parts.push(pc.dim('⏹️ STOPPED'));
  }

  // ── Iteration Progress ──
  if (cfg.show_iteration) {
    const maxIter = 50; // Default max
    parts.push(`${pc.cyan('Iter')} ${state.iteration}/${maxIter}`);
    parts.push(createProgressBar(state.iteration, maxIter, 10, false));
  }

  // ── Score Display ──
  if (cfg.show_score && state.current_score > 0) {
    const scoreColor = state.current_score >= state.best_score ? pc.green : pc.yellow;
    parts.push(`${pc.cyan('Score')} ${scoreColor(state.current_score.toFixed(4))}`);
    parts.push(`${pc.dim('Best')} ${pc.green(state.best_score.toFixed(4))}`);
  }

  // ── Target Progress ──
  if (cfg.show_target && state.target_score) {
    const gap = state.target_score - state.best_score;
    parts.push(`${pc.cyan('Target')} ${state.target_score.toFixed(4)}`);
    if (gap > 0) {
      parts.push(pc.yellow(`Gap: ${gap.toFixed(4)}`));
      parts.push(createScoreBar(state.best_score, state.target_score, 10));
    } else {
      parts.push(pc.green('✓ Achieved'));
    }
  }

  if (cfg.show_target && state.target_rank) {
    parts.push(`${pc.cyan('Target')} Top ${state.target_rank}`);
  }

  // ── Trend ──
  if (cfg.show_trend && experiments.length > 0) {
    parts.push(`${getTrendIcon(experiments)} ${getTrendText(experiments)}`);
  }

  // ── Time ──
  if (cfg.show_time && state.start_time) {
    parts.push(`${pc.dim('⏱')} ${formatDuration(state.start_time)}`);
  }

  return parts.join(pc.dim(' │ '));
}

export function renderCompactStatusline(directory: string): string {
  const state = loadState(directory);

  if (!state || !state.active) {
    return '';
  }

  const loopIcon = '🔄';
  const iter = `${state.iteration}/50`;
  const score = state.current_score > 0 ? state.current_score.toFixed(4) : '-.----';
  const best = state.best_score > 0 ? state.best_score.toFixed(4) : '-.----';

  return `${loopIcon} ${iter} | ${score} (best: ${best})`;
}

// ============================================================
// Full Dashboard
// ============================================================

export function renderDashboard(directory: string): string {
  const state = loadState(directory);
  const experiments = loadExperiments(directory);

  const lines: string[] = [];
  const width = 55;
  const border = pc.cyan('━'.repeat(width));

  lines.push('');
  lines.push(border);
  lines.push(pc.bold(pc.cyan('  📊 COMPETITION DASHBOARD')));
  lines.push(border);

  if (!state) {
    lines.push('');
    lines.push(pc.dim('  No active competition loop.'));
    lines.push(pc.dim('  Start with: /loop <target>'));
    lines.push('');
    lines.push(border);
    return lines.join('\n');
  }

  // ── Status Section ──
  lines.push('');
  lines.push(pc.bold('  Status'));
  if (state.active) {
    lines.push(`    ${pc.green('●')} Loop: ${pc.green('ACTIVE')}`);
  } else {
    lines.push(`    ${pc.red('●')} Loop: ${pc.red('STOPPED')}`);
  }
  lines.push(`    📍 Iteration: ${state.iteration} / 50`);
  lines.push(`    ${createProgressBar(state.iteration, 50, 25)}`);

  // ── Scores Section ──
  lines.push('');
  lines.push(pc.bold('  Scores'));

  const currentColor = state.current_score >= state.best_score ? pc.green : pc.yellow;
  lines.push(`    Current:  ${currentColor(state.current_score.toFixed(5))}`);
  lines.push(`    Best:     ${pc.green(state.best_score.toFixed(5))} ${pc.dim(`(iter ${state.best_iteration})`)}`);

  if (state.target_score) {
    const gap = state.target_score - state.best_score;
    lines.push(`    Target:   ${pc.cyan(state.target_score.toFixed(5))}`);
    if (gap > 0) {
      lines.push(`    Gap:      ${pc.yellow(gap.toFixed(5))} ${pc.dim(`(${(gap / state.target_score * 100).toFixed(1)}%)`)}`);
      lines.push(`    Progress: ${createScoreBar(state.best_score, state.target_score, 25)}`);
    } else {
      lines.push(`    ${pc.green('    ✓ TARGET ACHIEVED!')}`);
    }
  }

  if (state.target_rank) {
    lines.push(`    Target:   ${pc.cyan(`Top ${state.target_rank}`)}`);
  }

  // ── Trend Section ──
  lines.push('');
  lines.push(pc.bold('  Trend'));
  lines.push(`    ${getTrendIcon(experiments)} ${getTrendText(experiments)}`);

  if (experiments.length > 0) {
    const recent = experiments.slice(-3);
    lines.push('');
    lines.push(pc.bold('  Recent Experiments'));

    for (const exp of recent) {
      const resultIcon = exp.result === 'improved' ? pc.green('✓')
        : exp.result === 'degraded' ? pc.red('✗')
        : pc.yellow('−');
      const scoreText = exp.cv_score.toFixed(4);
      const hypText = exp.hypothesis.length > 25
        ? exp.hypothesis.slice(0, 22) + '...'
        : exp.hypothesis;

      lines.push(`    ${resultIcon} #${exp.iteration} ${pc.dim(hypText)} → ${scoreText}`);
    }
  }

  // ── Time Section ──
  if (state.start_time) {
    lines.push('');
    lines.push(pc.bold('  Time'));
    lines.push(`    Started:  ${new Date(state.start_time).toLocaleString()}`);
    lines.push(`    Duration: ${formatDuration(state.start_time)}`);
  }

  lines.push('');
  lines.push(border);
  lines.push('');

  return lines.join('\n');
}

// ============================================================
// Plugin Export (Statusline Hook)
// ============================================================

export default function competitionStatuslinePlugin(context: any) {
  const { directory } = context;

  return {
    name: 'competition-statusline',
    version: '1.0.0',

    statusline: {
      /**
       * Called to render the statusline
       * Returns formatted status string
       */
      render: () => {
        return renderStatusline(directory);
      },

      /**
       * Compact version for narrow terminals
       */
      renderCompact: () => {
        return renderCompactStatusline(directory);
      },

      /**
       * Full dashboard view
       */
      renderFull: () => {
        return renderDashboard(directory);
      },
    },

    // Export functions for direct use
    exports: {
      renderStatusline: (cfg?: Partial<StatuslineConfig>) => renderStatusline(directory, cfg),
      renderDashboard: () => renderDashboard(directory),
    },
  };
}
