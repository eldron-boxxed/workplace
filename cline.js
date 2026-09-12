#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const packageJsonPath = path.join(__dirname, 'package.json');
const packageInfo = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const args = process.argv.slice(2);

function printHelp() {
  console.log('Usage: cline [command] [options]');
  console.log('');
  console.log('Commands:');
  console.log('  status                 Show the current Cline CLI status');
  console.log('');
  console.log('Options:');
  console.log('  --help                 Show this help message');
  console.log('  --version              Show the current CLI version');
}

function printVersion() {
  console.log(packageInfo.version);
}

if (args.includes('--help') || args.includes('-h')) {
  printHelp();
  process.exit(0);
}

if (args.includes('--version') || args.includes('-v')) {
  printVersion();
  process.exit(0);
}

if (args.length === 0 || args[0] === 'status') {
  console.log('Cline CLI is ready');
  process.exit(0);
}

console.error(`Unknown command: ${args[0]}`);
console.error('Run "cline --help" for usage information.');
process.exit(1);
