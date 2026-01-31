#!/usr/bin/env node

import { Command } from 'commander';
import { install } from './commands/install.js';
import { uninstall } from './commands/uninstall.js';
import { doctor } from './commands/doctor.js';
import pc from 'picocolors';

const program = new Command();

program
  .name('opencode-competition')
  .version('0.1.0')
  .description('ML Competition Agent Orchestration Plugin for OpenCode');

program
  .command('install')
  .description('Install competition agents to .opencode/agent/')
  .option('-g, --global', 'Install to ~/.config/opencode/agent/')
  .option('-f, --force', 'Overwrite existing files')
  .action(async (options) => {
    try {
      await install(options);
    } catch (error) {
      console.error(pc.red(`Error: ${error}`));
      process.exit(1);
    }
  });

program
  .command('uninstall')
  .description('Remove competition agents')
  .option('-g, --global', 'Remove from ~/.config/opencode/agent/')
  .action(async (options) => {
    try {
      await uninstall(options);
    } catch (error) {
      console.error(pc.red(`Error: ${error}`));
      process.exit(1);
    }
  });

program
  .command('doctor')
  .description('Check environment and dependencies')
  .action(async () => {
    try {
      await doctor();
    } catch (error) {
      console.error(pc.red(`Error: ${error}`));
      process.exit(1);
    }
  });

program.parse();
