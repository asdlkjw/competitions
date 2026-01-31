import { existsSync, unlinkSync, rmdirSync, readdirSync } from 'fs';
import { join } from 'path';
import pc from 'picocolors';
import {
  AGENTS,
  getLocalInstallPath,
  getGlobalInstallPath,
} from '../utils/paths.js';

interface UninstallOptions {
  global?: boolean;
}

export async function uninstall(options: UninstallOptions = {}): Promise<void> {
  const installPath = options.global ? getGlobalInstallPath() : getLocalInstallPath();

  console.log(pc.cyan('\n🗑️  opencode-competition uninstaller\n'));
  console.log(pc.dim(`Removing from: ${installPath}\n`));

  if (!existsSync(installPath)) {
    console.log(pc.yellow('⊘ Agent directory does not exist. Nothing to remove.\n'));
    return;
  }

  let removed = 0;

  for (const agent of AGENTS) {
    const agentPath = join(installPath, agent);

    if (existsSync(agentPath)) {
      unlinkSync(agentPath);
      console.log(pc.red(`✗ Removed: ${agent}`));
      removed++;
    } else {
      console.log(pc.dim(`  Skipped (not found): ${agent}`));
    }
  }

  // Check if directory is empty and remove it
  try {
    const remaining = readdirSync(installPath);
    if (remaining.length === 0) {
      rmdirSync(installPath);
      console.log(pc.red(`\n✗ Removed empty directory: ${installPath}`));
    } else {
      console.log(pc.yellow(`\n⊘ Directory not empty, kept: ${installPath}`));
      console.log(pc.dim(`   Remaining files: ${remaining.join(', ')}`));
    }
  } catch {
    // Directory might not exist or other error
  }

  // Summary
  console.log(pc.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(pc.bold('Uninstall Summary'));
  console.log(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
  console.log(`  ${pc.red('✗')} Removed: ${pc.bold(String(removed))} agents`);
  console.log();
  console.log(pc.dim('Note: opencode.json was not modified.'));
  console.log(pc.dim('      Remove MCP settings manually if needed.\n'));
}
