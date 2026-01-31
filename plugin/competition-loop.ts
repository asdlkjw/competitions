/**
 * Competition Loop Plugin for OpenCode
 *
 * 경진대회용 반복 실행 플러그인
 * - 목표 점수/순위 도달까지 자동 반복
 * - 실험 결과 분석 및 개선 방향 제시
 * - 점수 변화 추적 및 롤백
 *
 * Usage:
 *   "top10 들어갈 때까지 진행해"
 *   "cv 0.85 넘을 때까지 반복해"
 *   "competition loop until score > 0.9"
 */

import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'fs';
import { join } from 'path';

// ============================================================
// Configuration
// ============================================================

interface LoopConfig {
  enabled: boolean;
  max_iterations: number;
  target_score: number | null;
  target_rank: number | null;
  metric_direction: 'maximize' | 'minimize';
  cooldown_seconds: number;
  auto_submit: boolean;
}

interface ExperimentLog {
  iteration: number;
  timestamp: string;
  cv_score: number;
  lb_score: number | null;
  model: string;
  features_added: string[];
  features_removed: string[];
  params_changed: Record<string, any>;
  hypothesis: string;
  result: 'improved' | 'degraded' | 'unchanged';
  analysis: string;
  next_action: string;
}

// Default configuration
const DEFAULT_CONFIG: LoopConfig = {
  enabled: false,
  max_iterations: 50,
  target_score: null,
  target_rank: null,
  metric_direction: 'maximize',
  cooldown_seconds: 5,
  auto_submit: false,
};

// ============================================================
// State Management
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

let loopState: LoopState = {
  active: false,
  iteration: 0,
  best_score: -Infinity,
  best_iteration: 0,
  current_score: 0,
  target_score: null,
  target_rank: null,
  experiments: [],
  start_time: '',
  metric_direction: 'maximize',
};

// ============================================================
// Keyword Detection
// ============================================================

const LOOP_KEYWORDS = {
  // Korean
  '까지': true,
  '반복': true,
  '계속': true,
  'top10': true,
  'top5': true,
  'top1': true,
  '상위': true,
  '넘을때까지': true,
  '도달할때까지': true,

  // English
  'until': true,
  'loop': true,
  'repeat': true,
  'keep going': true,
  'competition loop': true,
};

const STOP_KEYWORDS = [
  '중단',
  '멈춰',
  'stop loop',
  'cancel loop',
  '/stop',
  '/cancel',
];

function detectLoopIntent(prompt: string): {
  isLoop: boolean;
  targetScore: number | null;
  targetRank: number | null;
} {
  const lowerPrompt = prompt.toLowerCase();

  // Check for stop keywords first
  for (const keyword of STOP_KEYWORDS) {
    if (lowerPrompt.includes(keyword)) {
      return { isLoop: false, targetScore: null, targetRank: null };
    }
  }

  // Check for loop keywords
  let isLoop = false;
  for (const keyword of Object.keys(LOOP_KEYWORDS)) {
    if (lowerPrompt.includes(keyword.toLowerCase())) {
      isLoop = true;
      break;
    }
  }

  if (!isLoop) {
    return { isLoop: false, targetScore: null, targetRank: null };
  }

  // Extract target score (e.g., "0.85", "85%", "cv 0.9")
  let targetScore: number | null = null;
  const scorePatterns = [
    /(?:score|cv|점수)[^\d]*(\d+\.?\d*)/i,
    /(\d+\.?\d*)\s*(?:이상|넘|달성)/,
    /(?:>|>=)\s*(\d+\.?\d*)/,
    /(\d+)%/,
  ];

  for (const pattern of scorePatterns) {
    const match = prompt.match(pattern);
    if (match) {
      targetScore = parseFloat(match[1]);
      // Convert percentage to decimal if needed
      if (targetScore > 1 && targetScore <= 100) {
        targetScore = targetScore / 100;
      }
      break;
    }
  }

  // Extract target rank (e.g., "top10", "상위 5등")
  let targetRank: number | null = null;
  const rankPatterns = [
    /top\s*(\d+)/i,
    /상위\s*(\d+)/,
    /(\d+)등\s*안/,
    /(\d+)위\s*안/,
  ];

  for (const pattern of rankPatterns) {
    const match = prompt.match(pattern);
    if (match) {
      targetRank = parseInt(match[1]);
      break;
    }
  }

  return { isLoop, targetScore, targetRank };
}

// ============================================================
// Score Analysis
// ============================================================

function analyzeScoreChange(
  prevExperiment: ExperimentLog | null,
  currentExperiment: ExperimentLog
): string {
  if (!prevExperiment) {
    return `Initial baseline established with CV: ${currentExperiment.cv_score.toFixed(4)}`;
  }

  const scoreDiff = currentExperiment.cv_score - prevExperiment.cv_score;
  const percentChange = (scoreDiff / prevExperiment.cv_score * 100).toFixed(2);

  let analysis = '';

  if (scoreDiff > 0.001) {
    analysis = `✅ IMPROVED by ${scoreDiff.toFixed(4)} (+${percentChange}%)\n`;
    analysis += `Successful changes:\n`;

    if (currentExperiment.features_added.length > 0) {
      analysis += `  - Added features: ${currentExperiment.features_added.join(', ')}\n`;
    }
    if (Object.keys(currentExperiment.params_changed).length > 0) {
      analysis += `  - Param changes: ${JSON.stringify(currentExperiment.params_changed)}\n`;
    }
    analysis += `Recommendation: Continue in this direction. Try similar feature engineering.`;

  } else if (scoreDiff < -0.001) {
    analysis = `❌ DEGRADED by ${Math.abs(scoreDiff).toFixed(4)} (${percentChange}%)\n`;
    analysis += `Failed hypothesis: "${currentExperiment.hypothesis}"\n`;
    analysis += `Recommendation: Revert changes and try alternative approach.\n`;

    if (currentExperiment.features_added.length > 0) {
      analysis += `  - Remove: ${currentExperiment.features_added.join(', ')}\n`;
    }

  } else {
    analysis = `➡️ NO SIGNIFICANT CHANGE (${scoreDiff.toFixed(4)})\n`;
    analysis += `The changes had minimal impact.\n`;
    analysis += `Recommendation: Try a more aggressive approach or different feature category.`;
  }

  return analysis;
}

function generateNextAction(state: LoopState): string {
  const lastExp = state.experiments[state.experiments.length - 1];
  const prevExp = state.experiments[state.experiments.length - 2];

  // Analyze patterns from experiments
  const improvements = state.experiments.filter(e => e.result === 'improved');
  const degradations = state.experiments.filter(e => e.result === 'degraded');

  let suggestion = '';

  // If stuck (no improvement for 5+ iterations)
  const recentExps = state.experiments.slice(-5);
  const recentImprovements = recentExps.filter(e => e.result === 'improved').length;

  if (recentImprovements === 0 && state.iteration > 5) {
    suggestion = `
🔄 STRATEGY CHANGE RECOMMENDED

No improvement in last 5 iterations. Consider:
1. Try a completely different model type (Neural Network, TabNet)
2. Revisit feature engineering from scratch
3. Check for data leakage or overfitting
4. Consider pseudo-labeling or semi-supervised approaches
`;
  } else if (lastExp?.result === 'improved') {
    suggestion = `
📈 CONTINUE MOMENTUM

Last change was successful. Suggested next steps:
1. Similar feature engineering in same direction
2. Fine-tune hyperparameters of best model
3. Add more models to ensemble for diversity
`;
  } else {
    suggestion = `
🔍 EXPLORATION NEEDED

Suggested experiments:
1. Target encoding with different smoothing
2. Feature interactions (multiply, divide key features)
3. Aggregation features (groupby statistics)
4. Try different CV strategy
`;
  }

  // Add score gap info
  if (state.target_score) {
    const gap = state.target_score - state.best_score;
    suggestion += `\n📊 Gap to target: ${gap.toFixed(4)} (need +${(gap / state.best_score * 100).toFixed(2)}%)`;
  }

  return suggestion;
}

// ============================================================
// File I/O
// ============================================================

const EXPERIMENTS_FILE = 'experiments.jsonl';
const STATE_FILE = '.competition-loop-state.json';

function saveState(directory: string) {
  const statePath = join(directory, STATE_FILE);
  writeFileSync(statePath, JSON.stringify(loopState, null, 2));
}

function loadState(directory: string): boolean {
  const statePath = join(directory, STATE_FILE);
  if (existsSync(statePath)) {
    try {
      loopState = JSON.parse(readFileSync(statePath, 'utf-8'));
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

function logExperiment(directory: string, experiment: ExperimentLog) {
  const logPath = join(directory, EXPERIMENTS_FILE);
  appendFileSync(logPath, JSON.stringify(experiment) + '\n');
}

// ============================================================
// Plugin Export
// ============================================================

export default function competitionLoopPlugin(context: any) {
  const { directory } = context;

  // Try to restore state
  loadState(directory);

  return {
    name: 'competition-loop',
    version: '1.0.0',

    hooks: {
      /**
       * UserPromptSubmit: Detect loop keywords and activate loop mode
       */
      UserPromptSubmit: async ({ prompt }: { prompt: string }) => {
        // Check for stop command
        for (const keyword of STOP_KEYWORDS) {
          if (prompt.toLowerCase().includes(keyword)) {
            if (loopState.active) {
              loopState.active = false;
              saveState(directory);
              return {
                decision: 'allow',
                inject: `
🛑 Competition loop stopped.

📊 Summary:
- Total iterations: ${loopState.iteration}
- Best score: ${loopState.best_score.toFixed(4)} (iteration ${loopState.best_iteration})
- Final score: ${loopState.current_score.toFixed(4)}
`,
              };
            }
            return { decision: 'allow' };
          }
        }

        // Detect loop intent
        const { isLoop, targetScore, targetRank } = detectLoopIntent(prompt);

        if (isLoop) {
          loopState = {
            active: true,
            iteration: 0,
            best_score: -Infinity,
            best_iteration: 0,
            current_score: 0,
            target_score: targetScore,
            target_rank: targetRank,
            experiments: [],
            start_time: new Date().toISOString(),
            metric_direction: 'maximize',
          };

          saveState(directory);

          const targetInfo = targetScore
            ? `Target score: ${targetScore}`
            : targetRank
            ? `Target rank: Top ${targetRank}`
            : 'Until manually stopped';

          return {
            decision: 'allow',
            inject: `
🔄 COMPETITION LOOP ACTIVATED

${targetInfo}
Max iterations: ${DEFAULT_CONFIG.max_iterations}

Loop will continue until:
- Target achieved
- Max iterations reached
- Manual stop (/stop or "중단")

Starting iteration 1...
`,
          };
        }

        return { decision: 'allow' };
      },

      /**
       * Stop: Check if we should continue the loop
       */
      Stop: async ({ messages }: { messages: any[] }) => {
        if (!loopState.active) {
          return { decision: 'allow' };
        }

        loopState.iteration++;

        // Try to extract score from recent messages
        const recentContent = messages
          .slice(-5)
          .map((m: any) => m.content || '')
          .join('\n');

        // Extract CV score
        const scoreMatch = recentContent.match(/(?:cv|CV|score)[\s:]*(\d+\.\d+)/);
        if (scoreMatch) {
          loopState.current_score = parseFloat(scoreMatch[1]);

          // Update best if improved
          const improved = loopState.metric_direction === 'maximize'
            ? loopState.current_score > loopState.best_score
            : loopState.current_score < loopState.best_score;

          if (improved) {
            loopState.best_score = loopState.current_score;
            loopState.best_iteration = loopState.iteration;
          }
        }

        // Check completion conditions
        let completed = false;
        let completionReason = '';

        // Max iterations check
        if (loopState.iteration >= DEFAULT_CONFIG.max_iterations) {
          completed = true;
          completionReason = `Maximum iterations (${DEFAULT_CONFIG.max_iterations}) reached`;
        }

        // Target score check
        if (loopState.target_score && loopState.current_score >= loopState.target_score) {
          completed = true;
          completionReason = `Target score ${loopState.target_score} achieved!`;
        }

        if (completed) {
          loopState.active = false;
          saveState(directory);

          return {
            decision: 'allow',
            message: `
🏆 COMPETITION LOOP COMPLETE

${completionReason}

📊 Final Results:
- Total iterations: ${loopState.iteration}
- Best score: ${loopState.best_score.toFixed(4)} (iteration ${loopState.best_iteration})
- Final score: ${loopState.current_score.toFixed(4)}

Check experiments.jsonl for full history.
`,
          };
        }

        // Continue loop - block stop and inject next iteration prompt
        saveState(directory);

        const nextAction = generateNextAction(loopState);
        const scoreDiff = loopState.current_score - loopState.best_score;
        const status = scoreDiff >= 0 ? '📈' : '📉';

        return {
          decision: 'block',
          message: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 LOOP ITERATION ${loopState.iteration} COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${status} Current: ${loopState.current_score.toFixed(4)}
🏆 Best: ${loopState.best_score.toFixed(4)} (iter ${loopState.best_iteration})
🎯 Target: ${loopState.target_score?.toFixed(4) || 'Not set'}
📍 Progress: ${loopState.iteration}/${DEFAULT_CONFIG.max_iterations}

${nextAction}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Starting iteration ${loopState.iteration + 1}...

Based on the analysis above, proceed with the next experiment.
Focus on the suggested improvements.
Record your hypothesis before making changes.
Report CV score after each experiment.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`,
        };
      },
    },
  };
}
