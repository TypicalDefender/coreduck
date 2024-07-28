import { expect, test } from '@jest/globals';
import * as cp from 'child_process';
import * as path from 'path';
import * as process from 'process';

function setupEnvironment() {
  process.env['INPUT_ACTION'] = 'code-review';
}

function executeChildProcess() {
  const np = process.execPath;
  const ip = path.join(__dirname, '..', 'lib', 'main.js');
  const options: cp.ExecFileSyncOptions = {
    env: process.env,
  };
  return cp.execFileSync(np, [ip], options).toString();
}

test('test runs', () => {
  setupEnvironment();
  const output = executeChildProcess();
  console.log(output);
});
