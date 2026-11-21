import { constants } from 'node:os';
import { stripVTControlCharacters } from 'node:util';

const MAX_LINE_BYTES = 2048;
const MAX_RECORD_BYTES = 512;
const OPERATIONS = new Set(['auth_package', 'commercial_version', 'commercial_package']);
const SPAWN_CATEGORIES = new Map([
  ['EACCES', 'permissions'], ['EPERM', 'permissions'],
  ['EAGAIN', 'resources'], ['ENOMEM', 'resources'], ['EMFILE', 'resources'], ['ENFILE', 'resources'],
]);
const PHASES = new Map([
  ['resources:resources', 'resources'],
  ['compiler:compile', 'compile'],
  ['resources:testResources', 'test_resources'],
  ['compiler:testCompile', 'test_compile'],
  ['surefire:test', 'test'],
  ['jar:jar', 'jar'],
  ['spring-boot:repackage', 'repackage'],
  ['dependency:copy-dependencies', 'copy_dependencies'],
]);
const CATEGORIES = [
  ['wrapper', /(?:wget|curl): failed to fetch|failed to download Maven|cannot read distributionUrl|failed to unzip|failed to untar|failed to install Maven|could not validate distribution SHA-256/i],
  ['resolution', /non-resolvable parent POM|could not resolve dependencies|dependencyresolutionexception|pluginresolutionexception|no plugin found for prefix|plugin .* could not be resolved/i],
  ['compilation', /compilation (?:error|failure)|cannot find symbol|release version .* not supported/i],
  ['network', /unknownhostexception|could not resolve host|could not transfer artifact|sslhandshakeexception|pkix path building|certificate verif|connection (?:reset|refused|timed out)|read timed out/i],
  ['permissions', /permission denied|accessdeniedexception|read-only file system|\bEACCES\b|\bEPERM\b/i],
  ['resources', /outofmemoryerror|cannot allocate memory|no space left on device|too many open files|resource temporarily unavailable/i],
];

function lineReader(onLine) {
  const line = Buffer.alloc(MAX_LINE_BYTES);
  let length = 0;
  let truncated = false;

  function flush() {
    if (length || truncated) onLine(truncated ? null : line.toString('utf8', 0, length));
    length = 0;
    truncated = false;
  }

  function push(chunk) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    let offset = 0;
    while (offset < bytes.length) {
      const newline = bytes.indexOf(10, offset);
      const end = newline === -1 ? bytes.length : newline;
      const count = Math.min(end - offset, MAX_LINE_BYTES - length);
      if (count) bytes.copy(line, length, offset, offset + count);
      length += count;
      truncated ||= end - offset > count;
      if (newline !== -1) flush();
      offset = end + 1;
    }
  }

  return { push, flush };
}

export function observeMaven(startChild, operation, log) {
  if (!OPERATIONS.has(operation)) throw new TypeError('Unknown Maven diagnostic operation');
  const startedAt = performance.now();
  let child;
  let phase = null, category = null, version = '', sawDiagnostic = false;
  let spawned = false, finished = false, timedOut = false, reportedTermination = false;
  let code = null, signal = null;

  function readLine(text, stdout) {
    if (text === null) {
      sawDiagnostic = true;
      return;
    }
    const line = stripVTControlCharacters(text).trim();
    if (stdout) {
      if (operation === 'commercial_version' && !version) {
        version = line.match(/^Apache Maven [0-9]+(?:\.[0-9]+)+/)?.[0] ?? '';
        if (version) phase = 'version';
      }
      if (line === '[INFO] Scanning for projects...') phase = 'project_discovery';
      const goal = line.match(/^\[INFO\]\s+--- ([\w-]+):[\w.-]+:([\w-]+)(?:\s|$)/);
      if (goal) phase = PHASES.get(goal[1] + ':' + goal[2]) ?? phase;
    }
    if (category === null && line && !/^\[(INFO|DEBUG|WARN(?:ING)?)\]/.test(line)) {
      const matches = CATEGORIES.filter(([, pattern]) => pattern.test(line));
      sawDiagnostic ||= !stdout || line.startsWith('[ERROR]') || matches.length > 0;
      if (matches.length === 1) category = matches[0][0];
    }
  }

  const stdout = lineReader(text => readLine(text, true));
  const stderr = lineReader(text => readLine(text, false));

  function report(outcome) {
    const record = {
      operation, outcome, code, signal,
      durationMs: Math.round(performance.now() - startedAt),
      lastPhase: phase,
      firstError: outcome === 'success' ? null : category ?? (sawDiagnostic ? 'unknown' : null),
    };
    const message = 'MAVEN_DIAGNOSTIC ' + JSON.stringify(record);
    if (Buffer.byteLength(message) > MAX_RECORD_BYTES) return;
    try {
      log(message);
    } catch {
      // Diagnostics must not interrupt process cancellation or cleanup.
    }
  }

  function captureTermination(exitCode, exitSignal) {
    if (Number.isSafeInteger(exitCode)) code = exitCode;
    if (exitSignal && Object.hasOwn(constants.signals, exitSignal)) signal = exitSignal;
  }

  function reportTimedOutTermination() {
    if (reportedTermination || (code === null && signal === null)) return;
    reportedTermination = true;
    report('timeout');
  }

  function onSpawn() { spawned = true; }

  function onExit(exitCode, exitSignal) {
    captureTermination(exitCode, exitSignal);
    if (timedOut) reportTimedOutTermination();
  }

  function detach() {
    finished = true;
    if (!child) return;
    child.stdout.off('data', stdout.push);
    child.stderr.off('data', stderr.push);
    child.off('spawn', onSpawn);
    child.off('error', onError);
    child.off('exit', onExit);
    child.off('close', onClose);
  }

  function onError(error) {
    if (spawned) return;
    if (!timedOut) {
      category = SPAWN_CATEGORIES.get(error?.code) ?? 'unknown';
      report('spawn_error');
    }
    detach();
  }

  function onClose(exitCode, exitSignal) {
    stdout.flush();
    stderr.flush();
    captureTermination(exitCode, exitSignal);
    if (timedOut) reportTimedOutTermination();
    else report(signal !== null ? 'signal' : code === 0 ? 'success' : 'nonzero_exit');
    detach();
  }

  try {
    child = startChild();
  } catch (error) {
    onError(error);
    throw error;
  }
  child.stdout.on('data', stdout.push);
  child.stderr.on('data', stderr.push);
  child.once('spawn', onSpawn);
  child.on('error', onError);
  child.once('exit', onExit);
  child.once('close', onClose);

  return {
    child,
    get version() { return version; },
    timeout() {
      if (finished || timedOut) return;
      timedOut = true;
      reportedTermination = code !== null || signal !== null;
      report('timeout');
    },
  };
}
