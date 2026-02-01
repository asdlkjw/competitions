import { existsSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';
import pc from 'picocolors';
import {
  AGENTS,
  COMMANDS,
  PLUGINS,
  getAgentPath,
  getCommandPath,
  getPluginPath,
  getLocalInstallPath,
  getGlobalInstallPath,
  getLocalCommandsPath,
  getGlobalCommandsPath,
  getLocalPluginPath,
  getGlobalPluginPath,
  getLocalConfigPath,
  getGlobalConfigPath,
  getTemplatePath,
} from '../utils/paths.js';

interface InstallOptions {
  global?: boolean;
  force?: boolean;
}

export async function install(options: InstallOptions = {}): Promise<void> {
  const agentInstallPath = options.global ? getGlobalInstallPath() : getLocalInstallPath();
  const commandsInstallPath = options.global ? getGlobalCommandsPath() : getLocalCommandsPath();
  const pluginInstallPath = options.global ? getGlobalPluginPath() : getLocalPluginPath();
  const configPath = options.global ? getGlobalConfigPath() : getLocalConfigPath();

  const agentSourcePath = getAgentPath();
  const commandSourcePath = getCommandPath();
  const pluginSourcePath = getPluginPath();

  console.log(pc.cyan('\n🚀 opencode-competition installer\n'));

  // ============================================================
  // Install Agents
  // ============================================================
  console.log(pc.bold('📦 Agents'));
  console.log(pc.dim(`   Installing to: ${agentInstallPath}\n`));

  if (!existsSync(agentInstallPath)) {
    mkdirSync(agentInstallPath, { recursive: true });
    console.log(pc.green(`   ✓ Created directory`));
  }

  let agentsInstalled = 0;
  let agentsSkipped = 0;

  for (const agent of AGENTS) {
    const sourcePath = join(agentSourcePath, agent);
    const destPath = join(agentInstallPath, agent);

    if (existsSync(destPath) && !options.force) {
      console.log(pc.yellow(`   ⊘ Skipped: ${agent}`));
      agentsSkipped++;
      continue;
    }

    if (!existsSync(sourcePath)) {
      console.log(pc.red(`   ✗ Not found: ${agent}`));
      continue;
    }

    copyFileSync(sourcePath, destPath);
    console.log(pc.green(`   ✓ Installed: ${agent}`));
    agentsInstalled++;
  }

  // ============================================================
  // Install Commands (Slash Commands)
  // ============================================================
  console.log(pc.bold('\n⌨️  Slash Commands'));
  console.log(pc.dim(`   Installing to: ${commandsInstallPath}\n`));

  if (!existsSync(commandsInstallPath)) {
    mkdirSync(commandsInstallPath, { recursive: true });
    console.log(pc.green(`   ✓ Created directory`));
  }

  let commandsInstalled = 0;
  let commandsSkipped = 0;

  for (const command of COMMANDS) {
    const sourcePath = join(commandSourcePath, command);
    const destPath = join(commandsInstallPath, command);

    if (existsSync(destPath) && !options.force) {
      console.log(pc.yellow(`   ⊘ Skipped: ${command}`));
      commandsSkipped++;
      continue;
    }

    if (!existsSync(sourcePath)) {
      console.log(pc.red(`   ✗ Not found: ${command}`));
      continue;
    }

    copyFileSync(sourcePath, destPath);
    console.log(pc.green(`   ✓ Installed: ${command}`));
    commandsInstalled++;
  }

  // ============================================================
  // Install Plugins (Hooks)
  // ============================================================
  console.log(pc.bold('\n🔌 Plugins'));
  console.log(pc.dim(`   Installing to: ${pluginInstallPath}\n`));

  if (!existsSync(pluginInstallPath)) {
    mkdirSync(pluginInstallPath, { recursive: true });
    console.log(pc.green(`   ✓ Created directory`));
  }

  let pluginsInstalled = 0;
  let pluginsSkipped = 0;

  for (const plugin of PLUGINS) {
    const sourcePath = join(pluginSourcePath, plugin);
    const destPath = join(pluginInstallPath, plugin);

    if (existsSync(destPath) && !options.force) {
      console.log(pc.yellow(`   ⊘ Skipped: ${plugin}`));
      pluginsSkipped++;
      continue;
    }

    if (!existsSync(sourcePath)) {
      console.log(pc.red(`   ✗ Not found: ${plugin}`));
      continue;
    }

    copyFileSync(sourcePath, destPath);
    console.log(pc.green(`   ✓ Installed: ${plugin}`));
    pluginsInstalled++;
  }

  // ============================================================
  // MCP Configuration
  // ============================================================
  console.log(pc.bold('\n📋 Configuration'));

  const templatePath = join(getTemplatePath(), 'opencode.json');

  if (existsSync(templatePath)) {
    if (existsSync(configPath)) {
      console.log(pc.yellow(`   ⊘ opencode.json exists`));
      console.log(pc.dim('      Run with --force to overwrite'));

      if (options.force) {
        copyFileSync(templatePath, configPath);
        console.log(pc.green(`   ✓ Overwrote: opencode.json`));
      }
    } else {
      copyFileSync(templatePath, configPath);
      console.log(pc.green(`   ✓ Created: opencode.json`));
      console.log(pc.yellow('   ⚠ Remember to update API keys'));
    }
  }

  // ============================================================
  // Summary
  // ============================================================
  console.log(pc.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(pc.bold('Installation Summary'));
  console.log(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

  console.log(`  ${pc.bold('Agents:')}`);
  console.log(`    ${pc.green('✓')} Installed: ${agentsInstalled}`);
  if (agentsSkipped > 0) {
    console.log(`    ${pc.yellow('⊘')} Skipped:   ${agentsSkipped}`);
  }

  console.log(`\n  ${pc.bold('Commands:')}`);
  console.log(`    ${pc.green('✓')} Installed: ${commandsInstalled}`);
  if (commandsSkipped > 0) {
    console.log(`    ${pc.yellow('⊘')} Skipped:   ${commandsSkipped}`);
  }

  console.log(`\n  ${pc.bold('Plugins:')}`);
  console.log(`    ${pc.green('✓')} Installed: ${pluginsInstalled}`);
  if (pluginsSkipped > 0) {
    console.log(`    ${pc.yellow('⊘')} Skipped:   ${pluginsSkipped}`);
  }

  // ============================================================
  // Available Commands
  // ============================================================
  console.log(pc.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(pc.bold('Available Slash Commands'));
  console.log(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

  console.log(`  ${pc.cyan('/loop')} ${pc.dim('<target>')}     - Start competition loop`);
  console.log(`  ${pc.cyan('/stop')}              - Stop the loop`);
  console.log(`  ${pc.cyan('/status')}            - Check loop status`);
  console.log(`  ${pc.cyan('/experiment')} ${pc.dim('<hyp>')} - Run single experiment`);
  console.log(`  ${pc.cyan('/dashboard')}         - Show full dashboard`);
  console.log(`  ${pc.cyan('/usage')}             - Show subscription usage`);

  console.log(pc.dim('\n  Examples:'));
  console.log(pc.dim('    /loop cv 0.85'));
  console.log(pc.dim('    /loop top10'));
  console.log(pc.dim('    /experiment Add target encoding'));

  // ============================================================
  // Next Steps
  // ============================================================
  console.log(pc.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(pc.bold('Next Steps'));
  console.log(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

  console.log(`  1. ${pc.dim('Update API keys in')} opencode.json`);
  console.log(`  2. ${pc.dim('Start OpenCode:')} ${pc.cyan('opencode')}`);
  console.log(`  3. ${pc.dim('Single run:')} ${pc.cyan('https://kaggle.com/c/titanic')}`);
  console.log(`  4. ${pc.dim('Loop mode:')} ${pc.cyan('/loop cv 0.85')}`);

  console.log(pc.green('\n✨ Installation complete!\n'));
}
