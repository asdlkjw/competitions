import { existsSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import pc from 'picocolors';
import {
  AGENTS,
  getLocalInstallPath,
  getGlobalInstallPath,
  getLocalConfigPath,
  getGlobalConfigPath,
} from '../utils/paths.js';

interface CheckResult {
  name: string;
  status: 'ok' | 'warn' | 'error';
  message: string;
}

function checkCommand(cmd: string): boolean {
  try {
    execSync(`which ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function getVersion(cmd: string): string {
  try {
    return execSync(`${cmd} --version`, { encoding: 'utf-8' }).trim().split('\n')[0];
  } catch {
    return 'unknown';
  }
}

export async function doctor(): Promise<void> {
  console.log(pc.cyan('\n🩺 opencode-competition doctor\n'));
  console.log(pc.dim('Checking your environment...\n'));

  const results: CheckResult[] = [];

  // Check OpenCode installation
  console.log(pc.bold('OpenCode'));
  console.log(pc.dim('─'.repeat(50)));

  if (checkCommand('opencode')) {
    const version = getVersion('opencode');
    results.push({ name: 'OpenCode', status: 'ok', message: version });
    console.log(pc.green(`  ✓ OpenCode installed: ${version}`));
  } else {
    results.push({ name: 'OpenCode', status: 'error', message: 'Not found' });
    console.log(pc.red(`  ✗ OpenCode not found`));
    console.log(pc.dim('    Install: curl -fsSL https://opencode.ai/install | bash'));
  }
  console.log();

  // Check Node.js
  console.log(pc.bold('Runtime'));
  console.log(pc.dim('─'.repeat(50)));

  if (checkCommand('node')) {
    const version = getVersion('node');
    const major = parseInt(version.replace('v', '').split('.')[0]);
    if (major >= 18) {
      results.push({ name: 'Node.js', status: 'ok', message: version });
      console.log(pc.green(`  ✓ Node.js: ${version}`));
    } else {
      results.push({ name: 'Node.js', status: 'warn', message: `${version} (>=18 recommended)` });
      console.log(pc.yellow(`  ⚠ Node.js: ${version} (>=18 recommended)`));
    }
  } else {
    results.push({ name: 'Node.js', status: 'error', message: 'Not found' });
    console.log(pc.red(`  ✗ Node.js not found`));
  }

  if (checkCommand('bun')) {
    const version = getVersion('bun');
    results.push({ name: 'Bun', status: 'ok', message: version });
    console.log(pc.green(`  ✓ Bun: ${version}`));
  } else {
    results.push({ name: 'Bun', status: 'warn', message: 'Not installed (optional)' });
    console.log(pc.dim(`  ○ Bun: Not installed (optional)`));
  }
  console.log();

  // Check agent installation
  console.log(pc.bold('Agent Installation'));
  console.log(pc.dim('─'.repeat(50)));

  const localPath = getLocalInstallPath();
  const globalPath = getGlobalInstallPath();

  let localInstalled = 0;
  let globalInstalled = 0;

  for (const agent of AGENTS) {
    if (existsSync(join(localPath, agent))) localInstalled++;
    if (existsSync(join(globalPath, agent))) globalInstalled++;
  }

  if (localInstalled > 0) {
    results.push({ name: 'Local agents', status: 'ok', message: `${localInstalled}/${AGENTS.length}` });
    console.log(pc.green(`  ✓ Local (.opencode/agent): ${localInstalled}/${AGENTS.length} agents`));
  } else {
    results.push({ name: 'Local agents', status: 'warn', message: 'Not installed' });
    console.log(pc.dim(`  ○ Local (.opencode/agent): Not installed`));
  }

  if (globalInstalled > 0) {
    results.push({ name: 'Global agents', status: 'ok', message: `${globalInstalled}/${AGENTS.length}` });
    console.log(pc.green(`  ✓ Global (~/.config/opencode): ${globalInstalled}/${AGENTS.length} agents`));
  } else {
    results.push({ name: 'Global agents', status: 'warn', message: 'Not installed' });
    console.log(pc.dim(`  ○ Global (~/.config/opencode): Not installed`));
  }
  console.log();

  // Check config
  console.log(pc.bold('Configuration'));
  console.log(pc.dim('─'.repeat(50)));

  const localConfigPath = getLocalConfigPath();
  const globalConfigPath = getGlobalConfigPath();

  for (const [name, path] of [['Local config', localConfigPath], ['Global config', globalConfigPath]] as const) {
    if (existsSync(path)) {
      try {
        const config = JSON.parse(readFileSync(path, 'utf-8'));
        const hasMcp = config.mcp && Object.keys(config.mcp).length > 0;
        if (hasMcp) {
          const mcpCount = Object.keys(config.mcp).length;
          results.push({ name, status: 'ok', message: `${mcpCount} MCP servers` });
          console.log(pc.green(`  ✓ ${name}: ${mcpCount} MCP servers configured`));
        } else {
          results.push({ name, status: 'warn', message: 'No MCP configured' });
          console.log(pc.yellow(`  ⚠ ${name}: No MCP servers configured`));
        }
      } catch {
        results.push({ name, status: 'error', message: 'Invalid JSON' });
        console.log(pc.red(`  ✗ ${name}: Invalid JSON`));
      }
    } else {
      results.push({ name, status: 'warn', message: 'Not found' });
      console.log(pc.dim(`  ○ ${name}: Not found`));
    }
  }
  console.log();

  // Check Python (for ML)
  console.log(pc.bold('ML Environment'));
  console.log(pc.dim('─'.repeat(50)));

  if (checkCommand('python3') || checkCommand('python')) {
    const pythonCmd = checkCommand('python3') ? 'python3' : 'python';
    const version = getVersion(pythonCmd);
    results.push({ name: 'Python', status: 'ok', message: version });
    console.log(pc.green(`  ✓ Python: ${version}`));

    // Check key ML packages
    const packages = ['pandas', 'numpy', 'sklearn', 'lightgbm', 'xgboost'];
    for (const pkg of packages) {
      try {
        execSync(`${pythonCmd} -c "import ${pkg}"`, { stdio: 'ignore' });
        console.log(pc.green(`  ✓ ${pkg}`));
      } catch {
        console.log(pc.dim(`  ○ ${pkg}: Not installed`));
      }
    }
  } else {
    results.push({ name: 'Python', status: 'warn', message: 'Not found' });
    console.log(pc.yellow(`  ⚠ Python not found (required for ML tasks)`));
  }
  console.log();

  // Summary
  const errors = results.filter(r => r.status === 'error').length;
  const warns = results.filter(r => r.status === 'warn').length;
  const oks = results.filter(r => r.status === 'ok').length;

  console.log(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(pc.bold('Summary'));
  console.log(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

  console.log(`  ${pc.green('✓')} Passed:   ${oks}`);
  console.log(`  ${pc.yellow('⚠')} Warnings: ${warns}`);
  console.log(`  ${pc.red('✗')} Errors:   ${errors}`);
  console.log();

  if (errors > 0) {
    console.log(pc.red('Some checks failed. Please fix the errors above.\n'));
    process.exit(1);
  } else if (warns > 0) {
    console.log(pc.yellow('Environment ready with some warnings.\n'));
  } else {
    console.log(pc.green('Environment is fully configured! 🎉\n'));
  }
}
