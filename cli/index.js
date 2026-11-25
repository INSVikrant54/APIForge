#!/usr/bin/env node
/** APIForge CLI entry point. */

import { readFileSync } from 'node:fs';
import { runInit, help as initHelp } from './commands/init.js';
import { runImport, help as importHelp } from './commands/import.js';
import { runRun, help as runHelp } from './commands/run.js';

const COMMANDS = {
  init: { run: runInit, help: initHelp },
  import: { run: runImport, help: importHelp },
  run: { run: runRun, help: runHelp }
};

function readVersion() {
  try {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function generalHelp() {
  return 'APIForge CLI\n\n'
    + 'Usage:\n'
    + '  apiforge <command> [options]\n\n'
    + 'Commands:\n'
    + '  init     Create apiforge.config.json with defaults\n'
    + '  import   Convert an OpenAPI/Swagger spec into a test suite\n'
    + '  run      Execute a test suite and report results\n\n'
    + 'Global options:\n'
    + '  --help       Show this help\n'
    + '  --version    Print version\n\n'
    + 'Run "apiforge <command> --help" for command-specific options.\n';
}

async function main(argv) {
  const [command, ...rest] = argv;

  if (!command || command === '--help' || command === '-h') {
    process.stdout.write(generalHelp());
    return 0;
  }
  if (command === '--version' || command === '-v') {
    process.stdout.write(`${readVersion()}\n`);
    return 0;
  }
  if (command === 'help') {
    const target = rest[0];
    if (!COMMANDS[target]) {
      throw new Error(`Unknown command: ${target || '(none)'}`);
    }
    process.stdout.write(`${COMMANDS[target].help}\n`);
    return 0;
  }

  const spec = COMMANDS[command];
  if (!spec) {
    throw new Error(`Unknown command: ${command}. Run "apiforge --help" for available commands.`);
  }
  if (rest.includes('--help') || rest.includes('-h')) {
    process.stdout.write(`${spec.help}\n`);
    return 0;
  }
  return spec.run(rest);
}

try {
  process.exitCode = await main(process.argv.slice(2));
} catch (err) {
  const message = err && err.message ? err.message : String(err);
  process.stderr.write(`error: ${message}\n`);
  process.exitCode = 2;
}
