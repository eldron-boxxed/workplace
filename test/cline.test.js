const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const cli = path.join(__dirname, '..', 'cline.js');

test('help shows usage information', () => {
  const result = spawnSync(process.execPath, [cli, '--help'], {
    encoding: 'utf8',
    cwd: path.join(__dirname, '..')
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage: cline/);
  assert.match(result.stdout, /--help/);
  assert.match(result.stdout, /--version/);
});

test('version prints the project version', () => {
  const result = spawnSync(process.execPath, [cli, '--version'], {
    encoding: 'utf8',
    cwd: path.join(__dirname, '..')
  });

  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), '1.0.0');
});

test('status command reports a ready CLI', () => {
  const result = spawnSync(process.execPath, [cli, 'status'], {
    encoding: 'utf8',
    cwd: path.join(__dirname, '..')
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Cline CLI is ready/);
});
