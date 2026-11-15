import { execFile, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, realpath } from 'node:fs/promises';
import { constants } from 'node:os';
import { basename, delimiter, dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import policy from './safety-policy.cjs';

export const QA_NODE_VERSION = 'v22.23.4';
export const QA_NPM_VERSION = '10.9.9';
const PNPM_VERSION = '12.19.0';
const LAUNCH_FLAG = '--qa-pnpm-launch';
const RECORD_TIMEOUT = 10000;
const RECORD_LIMIT = 512;
const FRONTEND = fileURLToPath(new URL('../../', import.meta.url));
const RUNNERS = Object.freeze({
  auth: { file: 'run-qa.mjs', flags: ['--headed', '--regression'] },
  recovery: { file: 'run-recovery.mjs', flags: ['--pending-ux', '--modal-ux'] },
});
const execFileAsync = promisify(execFile);

// SHA-256 of the executables extracted from the attested PNPM-2 archives.
const PNPM_EXECUTABLE_SHA256 = new Map([
  ['win32/x64', '9a4dcc51ad07f7159806b4cb14096ddb8f4831511eca0ed4adb8448ec1c18f97'],
  ['linux/x64', 'baae19a2dafc7b6d38980293904f8b8d0522adbe4cfda5c469c8e3175560e4d0'],
]);

export function validPnpmIdentity(identity) {
  if (!identity || typeof identity !== 'object' || Array.isArray(identity)) return false;
  const { name, version, platform, arch, sha256 } = identity;
  return Object.keys(identity).length === 5 && name === 'pnpm' && version === PNPM_VERSION
    && typeof platform === 'string' && typeof arch === 'string' && typeof sha256 === 'string'
    && sha256 === PNPM_EXECUTABLE_SHA256.get(`${platform}/${arch}`);
}

export function parseQaFlags(args, allowed) {
  const flags = new Set(args);
  if (flags.size !== args.length || args.some(arg => !allowed.includes(arg))) {
    throw Error('QA_ARGUMENT_OVERRIDE_FORBIDDEN');
  }
  return flags;
}

function isLocalAbsolute(executable) {
  return !!executable && isAbsolute(executable)
    && (process.platform !== 'win32' || /^[a-z]:[\\/]/i.test(executable));
}

function verifyNpmContext(allowedScripts, env) {
  const { npm_command: command, npm_config_user_agent: agent, npm_execpath: executable,
    npm_lifecycle_event: script } = env;
  if ([command, agent, executable, script].every(value => value === undefined)) return;
  if (command !== 'run-script' || !allowedScripts.includes(script) || !isLocalAbsolute(executable)
    || agent?.split(' ')[0] !== `npm/${QA_NPM_VERSION}`) {
    throw Error('QA_PACKAGE_MANAGER_CONTEXT_REJECTED');
  }
}

async function checkVersion(checked, executable, args, options) {
  try {
    return await checked(executable, args, options);
  } catch (error) {
    if (error.message.startsWith('QA_COMMAND_TIMEOUT')) throw Error('QA_COMMAND_TIMEOUT:PACKAGE_MANAGER');
    if (error.message.startsWith('QA_COMMAND_START_FAILED')) throw Error('QA_COMMAND_START_FAILED:PACKAGE_MANAGER');
    if (error.message === 'QA_INTERRUPTED') throw error;
    throw Error('QA_PACKAGE_MANAGER_VERSION_PROBE_FAILED');
  }
}

async function executableHash(file) {
  const hash = createHash('sha256');
  try {
    if (!(await lstat(file)).isFile()) throw Error();
    for await (const chunk of createReadStream(file)) hash.update(chunk);
    return hash.digest('hex');
  } catch {
    throw Error('QA_PNPM_EXECUTABLE_UNREADABLE');
  }
}

function pnpmLaunchEnv(env) {
  const child = { ...env };
  const path = process.platform === 'win32' ? Object.keys(env).find(key => /^path$/i.test(key)) : 'PATH';
  for (const key of Object.keys(child)) {
    if (/^(npm_|pnpm_|corepack_|init_cwd$|path$|node$)/i.test(key)) delete child[key];
  }
  return { ...child, PNPM_CONFIG_MANAGE_PACKAGE_MANAGER_VERSIONS: 'false', PNPM_CONFIG_PM_ON_FAIL: 'error',
    PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN: 'error', PNPM_CONFIG_RUNTIME: 'false', PNPM_CONFIG_RUNTIME_ON_FAIL: 'error',
    PNPM_CONFIG_OFFLINE: 'true', PATH: [dirname(process.execPath), path && env[path]].filter(Boolean).join(delimiter) };
}

export async function checkQaToolchain({ allowedScripts, cwd, checked,
  env = process.env, nodeVersion = process.version }) {
  if (nodeVersion !== QA_NODE_VERSION) throw Error('QA_NODE_VERSION_REQUIRED_22_23_4');
  verifyNpmContext(allowedScripts, env);
  const nodeDir = dirname(await realpath(process.execPath));
  const relative = process.platform === 'win32' ? 'node_modules/npm/bin/npm-cli.js' : '../lib/node_modules/npm/bin/npm-cli.js';
  const cli = await realpath(resolve(nodeDir, relative)).catch(() => { throw Error('QA_NPM_CLI_UNAVAILABLE'); });
  if (env.npm_execpath && await realpath(env.npm_execpath).catch(() => null) !== cli) {
    throw Error('QA_PACKAGE_MANAGER_CONTEXT_REJECTED');
  }
  const version = await checkVersion(checked, process.execPath, [cli, '--version'], { cwd, env, timeout: 10000 });
  if (version !== QA_NPM_VERSION) throw Error('QA_NPM_VERSION_REQUIRED_10_9_9');
  return { name: 'npm', version };
}

export async function verifyPnpmExecutable(path, options) {
  const { platform, arch } = process;
  if (!PNPM_EXECUTABLE_SHA256.has(`${platform}/${arch}`)) throw Error('QA_PNPM_PLATFORM_UNSUPPORTED');
  if (!isLocalAbsolute(path) || basename(path) !== (platform === 'win32' ? 'pnpm.exe' : 'pnpm')) {
    throw Error('QA_PNPM_EXECUTABLE_PATH_REJECTED');
  }
  const executable = await realpath(path).catch(() => { throw Error('QA_PNPM_EXECUTABLE_UNREADABLE'); });
  if (resolve(path) !== executable) throw Error('QA_PNPM_EXECUTABLE_PATH_REJECTED');
  const identity = { name: 'pnpm', version: PNPM_VERSION, platform, arch, sha256: await executableHash(executable) };
  if (!validPnpmIdentity(identity)) throw Error('QA_PNPM_INTEGRITY_REJECTED');
  const actual = await checkVersion(options.checked, executable, ['--version'],
    { cwd: options.cwd, env: options.env, timeout: RECORD_TIMEOUT });
  if (actual !== PNPM_VERSION) throw Error('QA_PNPM_VERSION_REQUIRED_12_19_0');
  return { executable, identity };
}

function readLaunchRecord(input) {
  return new Promise((done, fail) => {
    let bytes = Buffer.alloc(0);
    const timer = setTimeout(() => finish(Error('QA_PNPM_LAUNCH_RECORD_TIMEOUT')), RECORD_TIMEOUT);
    function finish(error) {
      clearTimeout(timer);
      input.removeListener('data', receive);
      input.removeListener('end', ended);
      input.removeListener('error', broken);
      input.removeListener('close', broken);
      input.destroy();
      if (error) fail(error);
      else done(bytes.toString('utf8'));
    }
    function receive(chunk) {
      if (bytes.length + chunk.length > RECORD_LIMIT) return finish(Error('QA_PNPM_LAUNCH_RECORD_INVALID'));
      bytes = Buffer.concat([bytes, chunk]);
    }
    function ended() { finish(); }
    function broken() { finish(Error('QA_PNPM_LAUNCH_RECORD_INVALID')); }
    input.on('end', ended).on('error', broken).on('close', broken).on('data', receive);
  });
}

export async function checkRunnerToolchain({ target, flags, ...options }) {
  if (!flags.has(LAUNCH_FLAG)) return checkQaToolchain(options);
  if (process.version !== QA_NODE_VERSION) throw Error('QA_NODE_VERSION_REQUIRED_22_23_4');
  const { stdin, ppid, platform, arch, env } = process;
  const candidate = env.npm_execpath;
  if (env.npm_lifecycle_event !== undefined || env.npm_command !== 'exec'
    || env.npm_config_user_agent?.split(' ')[0] !== `pnpm/${PNPM_VERSION}` || !isLocalAbsolute(candidate)
    || stdin.constructor.name !== 'Socket' || stdin.isTTY) {
    throw Error('QA_PNPM_CONTROLLED_LAUNCH_REQUIRED');
  }

  const raw = await readLaunchRecord(stdin);
  let record;
  try { record = JSON.parse(raw); } catch { throw Error('QA_PNPM_LAUNCH_RECORD_INVALID'); }
  if (!record || Object.keys(record).length !== 4 || raw !== `${JSON.stringify(record)}\n`
    || record.target !== target || record.pid !== ppid || ppid <= 1
    || record.executable !== await realpath(candidate).catch(() => null) || typeof record.executable !== 'string'
    || !validPnpmIdentity(record.identity) || record.identity.platform !== platform || record.identity.arch !== arch) {
    throw Error('QA_PNPM_LAUNCH_RECORD_INVALID');
  }
  return Object.freeze(record.identity);
}

export function parseRunnerFlags(args, allowed) {
  return parseQaFlags(args, [...allowed, LAUNCH_FLAG]);
}

async function launch(args) {
  const [command, target, path, ...flags] = args;
  if (command !== 'launch' || !Object.hasOwn(RUNNERS, target) || !path) throw Error('QA_PNPM_LAUNCH_USAGE');
  const runner = RUNNERS[target];
  parseQaFlags(flags, runner.flags);
  if (target === 'recovery' && flags.length > 1) throw Error('QA_ARGUMENT_OVERRIDE_FORBIDDEN');
  policy.rejectInherited(process.env);
  if (process.version !== QA_NODE_VERSION) throw Error('QA_NODE_VERSION_REQUIRED_22_23_4');
  const env = pnpmLaunchEnv(process.env);

  let child;
  let interruption;
  const probe = new AbortController();
  function interrupt(signal) {
    if (interruption) return;
    interruption = signal;
    if (!child) probe.abort();
    // On Windows Ctrl+C reaches the shared console. kill() there would skip runner cleanup.
    else if (process.platform !== 'win32' && child.exitCode === null && child.signalCode === null) child.kill(signal);
  }
  const onInt = () => interrupt('SIGINT');
  const onTerm = () => interrupt('SIGTERM');
  process.on('SIGINT', onInt);
  process.on('SIGTERM', onTerm);
  try {
    const { executable, identity } = await verifyPnpmExecutable(path, { cwd: FRONTEND, env,
      checked: async (file, versionArgs, options) => {
        try {
          const { stdout } = await execFileAsync(file, versionArgs, { ...options, windowsHide: true,
            signal: probe.signal, maxBuffer: 4096 });
          return stdout.trim();
        } catch (error) {
          if (probe.signal.aborted) throw Error('QA_INTERRUPTED');
          if (error.killed) throw Error('QA_COMMAND_TIMEOUT');
          if (typeof error.code === 'string') throw Error('QA_COMMAND_START_FAILED');
          throw error;
        }
      },
    });
    if (interruption) throw Error('QA_INTERRUPTED');
    return await new Promise((done, fail) => {
      const script = fileURLToPath(new URL(runner.file, import.meta.url));
      child = spawn(executable, ['exec', process.execPath, script, LAUNCH_FLAG, ...flags], {
        cwd: FRONTEND, env, shell: false, stdio: ['pipe', 'inherit', 'inherit'],
        // Without a controlling terminal pnpm relays signals to its child on Unix.
        detached: process.platform !== 'win32',
      });
      let deliveryFailed = false;
      let spawnFailed = false;
      child.stdin.on('error', () => { deliveryFailed = true; });
      child.once('error', () => { spawnFailed = true; });
      child.once('spawn', () => child.stdin.end(`${JSON.stringify({ target, pid: child.pid, executable, identity })}\n`));
      child.once('close', (code, signal) => {
        if (interruption || signal) return done(128 + (constants.signals[interruption ?? signal] ?? 15));
        if (spawnFailed || (deliveryFailed && code === 0)) return fail(Error('QA_PNPM_LAUNCH_FAILED'));
        done(code ?? 1);
      });
    });
  } catch (error) {
    if (interruption) return interruption === 'SIGINT' ? 130 : 143;
    throw error;
  } finally {
    process.off('SIGINT', onInt);
    process.off('SIGTERM', onTerm);
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  launch(process.argv.slice(2)).then(code => { process.exitCode = code; }).catch(error => {
    console.error('[QA_TOOLCHAIN] ' + (/^(QA_|UNSAFE_)/.test(error.message) ? error.message : 'QA_PNPM_LAUNCH_FAILED'));
    process.exitCode = 1;
  });
}
