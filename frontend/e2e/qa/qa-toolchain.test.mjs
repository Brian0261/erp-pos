import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, realpath, rm, rmdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkQaToolchain, parseQaFlags, QA_NODE_VERSION, validPnpmIdentity, verifyPnpmExecutable } from './qa-toolchain.mjs';
import { REQUIRED_SCENARIOS, validateRecoveryEvidence, validateRecoveryReport } from './run-recovery.mjs';

const pnpm = {
  name: 'pnpm', version: '12.19.0', platform: 'linux', arch: 'x64',
  sha256: 'baae19a2dafc7b6d38980293904f8b8d0522adbe4cfda5c469c8e3175560e4d0',
};
const allowedScripts = ['e2e:no-write'];
const pnpmContext = executable => ({
  npm_command: 'run-script', npm_config_user_agent: 'pnpm/12.19.0 npm/? node/?',
  npm_execpath: executable, npm_lifecycle_event: allowedScripts[0],
});

function runAuthPreflight(args, env, input) {
  const runner = fileURLToPath(new URL('run-qa.mjs', import.meta.url));
  return new Promise((done, fail) => {
    const child = spawn(process.execPath, [runner, ...args], { env, windowsHide: true,
      stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', bytes => output += bytes);
    child.stderr.on('data', bytes => output += bytes);
    child.once('error', fail).once('close', code => done({code, output}));
    if (child.stdin) {
      child.stdin.on('error', fail);
      child.stdin.end(input);
    }
  });
}

test('invalid arguments and package manager contexts fail before running a tool', async () => {
  assert.deepEqual([...parseQaFlags(['--headed'], ['--headed'])], ['--headed']);
  for (const args of [['--pnpm'], ['--headed', '--headed'], ['--npm'], ['--config=outside']]) {
    assert.throws(() => parseQaFlags(args, ['--headed']), /QA_ARGUMENT_OVERRIDE_FORBIDDEN/);
  }
  const context = pnpmContext(resolve('pnpm'));
  for (const env of [context, pnpmContext('pnpm'), {...context, npm_config_user_agent: 'npm/10.9.9', npm_lifecycle_event: 'start'},
    {...context, npm_config_user_agent: 'npm/10.9.8'}]) {
    await assert.rejects(checkQaToolchain({ allowedScripts, env }), /QA_PACKAGE_MANAGER_CONTEXT_REJECTED/);
  }
  await assert.rejects(checkQaToolchain({ nodeVersion: 'v22.23.3' }), /QA_NODE_VERSION_REQUIRED/);
});

test('a shim or an unreadable binary never reaches the version check', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'inktoy-qa-toolchain-'));
  try {
    const name = process.platform === 'win32' ? 'pnpm.exe' : 'pnpm';
    const shim = join(folder, name);
    await writeFile(shim, 'echo 12.19.0');
    for (const [file, error] of [[name, /QA_PNPM_EXECUTABLE_PATH_REJECTED/],
      [join(folder, 'pnpm.cmd'), /QA_PNPM_EXECUTABLE_PATH_REJECTED/], [shim, /QA_PNPM_INTEGRITY_REJECTED/],
      [join(folder, 'missing', name), /QA_PNPM_EXECUTABLE_UNREADABLE/]]) {
      await assert.rejects(verifyPnpmExecutable(file, { checked: () => assert.fail('unverified binary executed') }), error);
    }
  } finally {
    await rm(join(folder, process.platform === 'win32' ? 'pnpm.exe' : 'pnpm'), { force: true });
    await rmdir(folder);
  }
});

test('direct runner rejects inherited pnpm context before Docker', async () => {
  const executable = process.env.INKTOY_TEST_PNPM || resolve('pnpm');
  if (process.env.INKTOY_TEST_PNPM) {
    await verifyPnpmExecutable(executable, { checked: async () => '12.19.0' });
    await assert.rejects(verifyPnpmExecutable(executable, { checked: async () => '12.18.0' }), /QA_PNPM_VERSION_REQUIRED/);
  }
  for (const [flags, expected] of [
    [['--pnpm'], /QA_ARGUMENT_OVERRIDE_FORBIDDEN/],
    [[], /QA_PACKAGE_MANAGER_CONTEXT_REJECTED/],
    [['--qa-pnpm-launch'], /QA_PNPM_CONTROLLED_LAUNCH_REQUIRED/],
  ]) {
    const {code, output} = await runAuthPreflight(flags, pnpmContext(executable));
    assert.equal(code, 1);
    assert.match(output, expected);
    assert.doesNotMatch(output, /TOOLCHAIN PASS|PREPARATION/);
  }
});

test('the launch channel rejects missing, incomplete, repeated and oversized records', async () => {
  const env = {npm_command: 'exec', npm_config_user_agent: 'pnpm/12.19.0',
    npm_execpath: process.env.INKTOY_TEST_PNPM || resolve('pnpm')};
  for (const input of ['', '{', '{}\n{}\n', 'x'.repeat(513), '{"target":"auth","pid":1,"executable":"x","identity":null}\n']) {
    const {code, output} = await runAuthPreflight(['--qa-pnpm-launch'], env, input);
    assert.equal(code, 1);
    assert.match(output, /QA_PNPM_LAUNCH_RECORD_INVALID/);
    assert.doesNotMatch(output, /TOOLCHAIN PASS|PREPARATION/);
  }
});

test('the npm path invokes the Node installation CLI by absolute path', async () => {
  const node = await realpath(process.execPath);
  const relative = process.platform === 'win32' ? 'node_modules/npm/bin/npm-cli.js' : '../lib/node_modules/npm/bin/npm-cli.js';
  const cli = await realpath(resolve(dirname(node), relative));
  const checked = (file, args, options) => new Promise((done, fail) => {
    assert.equal(file, process.execPath);
    assert.deepEqual(args, [cli, '--version']);
    const child = spawn(file, args, { ...options, stdio: ['ignore', 'pipe', 'ignore'] });
    let output = '';
    child.stdout.on('data', data => output += data);
    child.on('error', fail);
    child.on('close', code => code === 0 ? done(output.trim()) : fail(Error('npm version failed')));
  });
  const npmContext = {...pnpmContext(cli), npm_config_user_agent: 'npm/10.9.9 node/v22.23.4'};
  for (const env of [{}, npmContext]) {
    assert.deepEqual(await checkQaToolchain({ usePnpm: false, allowedScripts, env, checked }), { name: 'npm', version: '10.9.9' });
  }
  for (const code of ['QA_COMMAND_START_FAILED', 'QA_COMMAND_TIMEOUT']) {
    await assert.rejects(checkQaToolchain({ env: {}, checked: async () => { throw Error(code + ':private path'); } }),
      { message: code + ':PACKAGE_MANAGER' });
  }
  await assert.rejects(checkQaToolchain({ env: {}, checked: async () => '10.9.8' }), /QA_NPM_VERSION_REQUIRED/);
});

function evidence() {
  const tests = REQUIRED_SCENARIOS.map(([file, title]) => ({ file, title, status: 'expected', attempts: 1, result: 'passed', retry: 0, errors: [] }));
  const summary = {
    schemaVersion: 1, runId: 'a'.repeat(24), result: 'PASS', selection: 'full', isolation: 'PASS', cleanup: 'PASS', phase: 'completed',
    startedAt: '2026-11-13T10:00:00Z', completedAt: '2026-11-13T10:00:01Z', durationMs: 1000,
    fixtureIsolation: { uniqueResources: true }, revision: { commit: 'b'.repeat(40) },
    backendArtifact: { generatedThisRun: true, sha256: 'c'.repeat(64), sizeBytes: 42 },
    versions: { node: 'v22.23.3', npm: '10.9.9', jar: 'jar 17.0.18', maven: 'Apache Maven 3.9.9', docker: '29.0.0',
      playwright: 'Version 1.61.1', images: Object.fromEntries(['tools', 'postgres', 'java'].map(role => [role, 'sha256:' + 'd'.repeat(64)])) },
    tests, errors: [],
  };
  return { summary, progress: tests.map(({title}) => ({title, status:'passed', errors:[]})) };
}

test('accept historical npm and verified pnpm evidence; reject crossed or altered metadata', () => {
  const { summary, progress } = evidence();
  validateRecoveryEvidence(summary, progress);
  assert.throws(() => validateRecoveryEvidence({...summary, versions: {...summary.versions, hostPackageManager: pnpm}}, progress));
  summary.versions.node = QA_NODE_VERSION;
  validateRecoveryEvidence(summary, progress);
  summary.schemaVersion = 2;
  delete summary.versions.npm;
  summary.versions.hostPackageManager = pnpm;
  summary.versions.qaImagePackageManager = {name: 'npm', version: '10.9.9'};
  assert.equal(validPnpmIdentity(pnpm), true);
  validateRecoveryEvidence(summary, progress);
  for (const mutate of [
    s => s.schemaVersion = 3, s => s.versions.npm = '10.9.9', s => s.versions.node = 'v22.23.3',
    s => s.versions.hostPackageManager.sha256 = '0'.repeat(64), s => s.versions.hostPackageManager.name = 'npm',
    s => s.versions.qaImagePackageManager.version = '12.19.0', s => delete s.versions.qaImagePackageManager,
    s => s.tests[0].title = 'substitute', s => s.tests[0].retry = 1, s => s.tests.pop(), s => s.cleanup = 'FAIL',
  ]) {
    const changed = structuredClone(summary);
    mutate(changed);
    assert.throws(() => validateRecoveryEvidence(changed, progress));
  }
  assert.throws(() => validateRecoveryEvidence(summary, progress.slice(1)), /QA_PROGRESS_EVIDENCE_REQUIRED/);
});

test('v3 requires compatible host and image identities and a complete commercial result', () => {
  const { summary, progress } = evidence();
  summary.schemaVersion = 3;
  delete summary.versions.npm;
  Object.assign(summary.versions, {
    node: QA_NODE_VERSION, qaImageNode: QA_NODE_VERSION, qaImageLockfileSha256: 'a'.repeat(64),
    hostPackageManager: {name: 'npm', version: '10.9.9'},
    qaImagePackageManager: {
      name: 'pnpm', version: '12.19.0', platform: 'linux', arch: 'x64',
      sha256: 'baae19a2dafc7b6d38980293904f8b8d0522adbe4cfda5c469c8e3175560e4d0',
    },
  });
  validateRecoveryEvidence(summary, progress);
  const windowsHost = {...pnpm, platform: 'win32',
    sha256: '9a4dcc51ad07f7159806b4cb14096ddb8f4831511eca0ed4adb8448ec1c18f97'};
  summary.versions.hostPackageManager = windowsHost;
  validateRecoveryEvidence(summary, progress);
  for (const mutate of [
    s => s.schemaVersion = 2,
    s => s.versions.npm = '10.9.9',
    s => s.versions.hostPackageManager = {name: 'npm', version: '10.9.8'},
    s => s.versions.qaImagePackageManager = {name: 'npm', version: '10.9.9'},
    s => s.versions.qaImagePackageManager = structuredClone(windowsHost),
    s => s.versions.qaImagePackageManager.version = '12.19.1',
    s => s.versions.qaImagePackageManager.sha256 = '0'.repeat(64),
    s => s.versions.qaImageNode = 'v22.23.3',
    s => delete s.versions.qaImageLockfileSha256,
    s => delete s.versions.images.tools,
    s => s.tests[0].retry = 1,
    s => s.isolation = 'FAIL',
  ]) {
    const invalid = structuredClone(summary);
    mutate(invalid);
    assert.throws(() => validateRecoveryEvidence(invalid, progress));
  }
  assert.throws(() => validateRecoveryEvidence(summary, progress.slice(1)), /QA_PROGRESS_EVIDENCE_REQUIRED/);
});

test('the commercial Playwright gate rejects flakes, skips and nonzero exit', () => {
  const report = {
    suites: [{specs: REQUIRED_SCENARIOS.map(([file,title]) => ({file,title,tests:[{ status:'expected', expectedStatus:'passed', results:[{status:'passed', retry:0}] }]}))}],
    errors: [], stats: {expected: REQUIRED_SCENARIOS.length, unexpected: 0, flaky: 0, skipped: 0},
  };
  assert.equal(validateRecoveryReport(report).length, 10);
  assert.throws(() => validateRecoveryReport(report, 1), /QA_RECOVERY_E2E_NOT_PASSED/);
  assert.throws(() => validateRecoveryReport({...report, stats:{...report.stats, flaky:1}}), /QA_INCONSISTENT_REPORT_STATS/);
  report.suites[0].specs[0].tests[0].status = 'skipped';
  assert.throws(() => validateRecoveryReport(report), /QA_FAILED_SKIPPED_INTERRUPTED_OR_RETRIED/);
});
