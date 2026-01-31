import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import pc from 'picocolors';
import {
  AGENTS,
  getAgentPath,
  getLocalInstallPath,
  getGlobalInstallPath,
  getLocalConfigPath,
  getGlobalConfigPath,
  getTemplatePath,
} from '../utils/paths.js';

interface InstallOptions {
  global?: boolean;
  force?: boolean;
}

export async function install(options: InstallOptions = {}): Promise<void> {
  const installPath = options.global ? getGlobalInstallPath() : getLocalInstallPath();
  const configPath = options.global ? getGlobalConfigPath() : getLocalConfigPath();
  const agentSourcePath = getAgentPath();

  console.log(pc.cyan('\n🚀 opencode-competition installer\n'));
  console.log(pc.dim(`Installing to: ${installPath}\n`));

  // Create directory if not exists
  if (!existsSync(installPath)) {
    mkdirSync(installPath, { recursive: true });
    console.log(pc.green(`✓ Created directory: ${installPath}`));
  }

  // Copy agent files
  let installed = 0;
  let skipped = 0;

  for (const agent of AGENTS) {
    const sourcePath = join(agentSourcePath, agent);
    const destPath = join(installPath, agent);

    if (existsSync(destPath) && !options.force) {
      console.log(pc.yellow(`⊘ Skipped (exists): ${agent}`));
      skipped++;
      continue;
    }

    if (!existsSync(sourcePath)) {
      console.log(pc.red(`✗ Source not found: ${agent}`));
      continue;
    }

    copyFileSync(sourcePath, destPath);
    console.log(pc.green(`✓ Installed: ${agent}`));
    installed++;
  }

  // Offer MCP configuration
  console.log(pc.cyan('\n📋 MCP Configuration\n'));

  const templatePath = join(getTemplatePath(), 'opencode.json');

  if (existsSync(templatePath)) {
    if (existsSync(configPath)) {
      console.log(pc.yellow(`⊘ opencode.json exists at ${configPath}`));
      console.log(pc.dim('   Run with --force to overwrite, or manually merge MCP settings'));

      if (options.force) {
        copyFileSync(templatePath, configPath);
        console.log(pc.green(`✓ Overwrote: ${configPath}`));
      }
    } else {
      copyFileSync(templatePath, configPath);
      console.log(pc.green(`✓ Created: ${configPath}`));
      console.log(pc.yellow('   ⚠ Remember to update API keys in the config file'));
    }
  }

  // Summary
  console.log(pc.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(pc.bold('Installation Summary'));
  console.log(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
  console.log(`  ${pc.green('✓')} Installed: ${pc.bold(String(installed))} agents`);
  if (skipped > 0) {
    console.log(`  ${pc.yellow('⊘')} Skipped:   ${pc.bold(String(skipped))} agents (use --force to overwrite)`);
  }
  console.log();
  console.log(pc.dim('Agents installed:'));
  for (const agent of AGENTS) {
    const name = agent.replace('.md', '');
    console.log(pc.dim(`  - ${name}`));
  }

  console.log(pc.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(pc.bold('Next Steps'));
  console.log(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
  console.log(`  1. ${pc.dim('Update API keys in')} opencode.json`);
  console.log(`  2. ${pc.dim('Start OpenCode and try:')} ${pc.cyan('@comp_orch https://kaggle.com/c/...')}`);
  console.log(`  3. ${pc.dim('Or switch agent with')} ${pc.cyan('Tab')} ${pc.dim('key')}`);
  console.log();
  console.log(pc.green('✨ Installation complete!\n'));
}
