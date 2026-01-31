import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { homedir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const AGENTS = [
  'comp_orch.md',
  'comp_plan.md',
  'insight.md',
  'learn_optim.md',
  'quick_task.md',
] as const;

export function getPackageRoot(): string {
  // Navigate from src/utils to package root
  return join(__dirname, '..', '..');
}

export function getAgentPath(): string {
  return join(getPackageRoot(), 'agents');
}

export function getTemplatePath(): string {
  return join(getPackageRoot(), 'templates');
}

export function getLocalInstallPath(): string {
  return join(process.cwd(), '.opencode', 'agent');
}

export function getGlobalInstallPath(): string {
  return join(homedir(), '.config', 'opencode', 'agent');
}

export function getLocalConfigPath(): string {
  return join(process.cwd(), 'opencode.json');
}

export function getGlobalConfigPath(): string {
  return join(homedir(), '.config', 'opencode', 'opencode.json');
}
