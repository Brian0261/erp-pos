import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { EventEmitter, once } from 'node:events';
import { join } from 'node:path';
import { test } from 'node:test';
import { observeMaven } from './maven-diagnostics.mjs';

const PREFIX = 'MAVEN_DIAGNOSTIC ';
const KEYS = ['code', 'durationMs', 'firstError', 'lastPhase', 'operation', 'outcome', 'signal'];

function processProbe(operation = 'auth_package', onLog = () => {}) {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  const logs = [];
  const observer = observeMaven(() => child, operation, message => {
    logs.push(message);
    onLog(message);
  });

  return {
    child, observer, logs,
    start() { child.emit('spawn'); },
    output(stream, text) { child[stream].emit('data', Buffer.from(text)); },
    close(code, signal = null) {
      child.emit('exit', code, signal);
      child.emit('close', code, signal);
    },
    records() {
      return logs.map(message => {
        assert.ok(message.startsWith(PREFIX));
        assert.ok(Buffer.byteLength(message) <= 512);
        const record = JSON.parse(message.slice(PREFIX.length));
        assert.deepEqual(Object.keys(record).sort(), KEYS);
        assert.ok(Number.isInteger(record.durationMs) && record.durationMs >= 0);
        return record;
      });
    },
  };
}

test('records a successful package and only recognizes allowlisted Maven phases', () => {
  const p = processProbe('commercial_package');
  p.start();
  p.output('stdout', '[INFO] Scanning for projects...\n[INFO] --- compiler:3.14.1:compile (default) @ backend ---\n');
  p.output('stdout', '[INFO] --- dependency:3.8.1:copy-dependencies (default) @ backend ---\n');
  p.output('stdout', '[INFO] --- custom:1:unexpected-goal @ private-project ---\n');
  p.close(0);
  const [record] = p.records();
  assert.equal(p.logs.length, 1);
  assert.equal(record.operation, 'commercial_package');
  assert.equal(record.outcome, 'success');
  assert.equal(record.code, 0);
  assert.equal(record.signal, null);
  assert.equal(record.lastPhase, 'copy_dependencies');
  assert.equal(record.firstError, null);
  assert.equal(p.observer.version, '');
});

test('extracts only the Maven version banner from fragmented, styled stdout', () => {
  const p = processProbe('commercial_version');
  p.start();
  p.output('stdout', '\u001b[1mApache Ma');
  p.output('stdout', 'ven 3.9.14\u001b[0m (opaque-revision)\r\nMaven home: /private/.m2\n');
  p.output('stderr', 'Apache Maven 9.9.9\n');
  p.close(0);
  assert.equal(p.observer.version, 'Apache Maven 3.9.14');
  assert.equal(p.records()[0].lastPhase, 'version');
  assert.doesNotMatch(p.logs.join('\n'), /opaque-revision|\/private|3\.9\.14/);
});

test('leaves a missing Maven version empty for the existing evidence check', () => {
  const p = processProbe('commercial_version');
  p.start();
  p.output('stderr', 'Apache Maven 3.9.14\n');
  p.close(0);
  assert.equal(p.observer.version, '');
  assert.equal(p.records()[0].lastPhase, null);
});

test('reports spawn errors with no fabricated exit code, phase or signal', () => {
  const p = processProbe();
  p.child.emit('error', Object.assign(new Error('spawn /private/mvnw EACCES'), { code: 'EACCES' }));
  p.child.emit('close', -13, null);
  p.observer.timeout();
  const [record] = p.records();
  assert.equal(p.logs.length, 1);
  assert.equal(record.outcome, 'spawn_error');
  assert.equal(record.code, null);
  assert.equal(record.signal, null);
  assert.equal(record.lastPhase, null);
  assert.equal(record.firstError, 'permissions');
  assert.doesNotMatch(p.logs[0], /private|EACCES/);
  assert.deepEqual(p.child.eventNames(), []);
  assert.deepEqual(p.child.stdout.eventNames(), []);
  assert.deepEqual(p.child.stderr.eventNames(), []);
});

test('keeps null for unavailable fields on a nonzero exit with no output', () => {
  const p = processProbe();
  p.start();
  p.close(7);
  const [record] = p.records();
  assert.equal(record.outcome, 'nonzero_exit');
  assert.equal(record.code, 7);
  assert.equal(record.signal, null);
  assert.equal(record.lastPhase, null);
  assert.equal(record.firstError, null);
});

test('observes a real subprocess without changing the exit seen by the caller', async () => {
  const logs = [];
  const start = () => spawn(process.execPath, [
    '-e', "process.stderr.write('[ERROR] Compilation failure'); process.exitCode = 7;",
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  const { child } = observeMaven(start, 'auth_package', message => logs.push(JSON.parse(message.slice(PREFIX.length))));
  const [code, signal] = await once(child, 'close');
  assert.equal(code, 7);
  assert.equal(signal, null);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].code, code);
  assert.equal(logs[0].outcome, 'nonzero_exit');
  assert.equal(logs[0].firstError, 'compilation');
});

test('an actual process startup failure still reaches the caller', async () => {
  const logs = [];
  const start = () => spawn(join(process.execPath, 'unavailable-command'), [], { stdio: ['ignore', 'pipe', 'pipe'] });
  let failure;
  try {
    const { child } = observeMaven(start, 'auth_package', message => logs.push(JSON.parse(message.slice(PREFIX.length))));
    [failure] = await once(child, 'error');
  } catch (error) {
    failure = error;
  }
  assert.match(failure.syscall, /^spawn\b/);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].outcome, 'spawn_error');
  assert.equal(logs[0].code, null);
  assert.equal(logs[0].signal, null);
});

test('rethrows a synchronous startup exception and uses only a fixed category', () => {
  const error = Object.assign(new Error('private process detail'), { code: 'ENOMEM' });
  const logs = [];
  assert.throws(() => observeMaven(() => { throw error; }, 'auth_package', message => logs.push(message)),
    caught => caught === error);
  assert.equal(logs.length, 1);
  assert.match(logs[0], /"outcome":"spawn_error"/);
  assert.match(logs[0], /"firstError":"resources"/);
  assert.doesNotMatch(logs[0], /private|ENOMEM/);
});

test('reports a real signal separately from a nonzero exit or a timeout', () => {
  const p = processProbe();
  p.start();
  p.output('stdout', '[INFO] Scanning for projects...\n');
  p.close(null, 'SIGTERM');
  p.observer.timeout();
  const [record] = p.records();
  assert.equal(p.logs.length, 1);
  assert.equal(record.outcome, 'signal');
  assert.equal(record.code, null);
  assert.equal(record.signal, 'SIGTERM');
  assert.equal(record.lastPhase, 'project_discovery');
  assert.equal(record.firstError, null);
});

test('reports a local timeout immediately and the later termination at most once', () => {
  const p = processProbe();
  p.start();
  p.observer.timeout();
  const [first] = p.records();
  assert.equal(first.outcome, 'timeout');
  assert.equal(first.code, null);
  assert.equal(first.signal, null);
  p.observer.timeout();
  p.close(null, 'SIGTERM');
  const records = p.records();
  assert.equal(records.length, 2);
  assert.equal(records[1].outcome, 'timeout');
  assert.equal(records[1].signal, 'SIGTERM');
  assert.ok(records[1].durationMs >= first.durationMs);
});

test('conserves an observed exit if the global deadline passes while streams close', () => {
  const p = processProbe('commercial_package');
  p.start();
  p.child.emit('exit', 0, null);
  p.observer.timeout();
  p.child.emit('close', 0, null);
  const [record] = p.records();
  assert.equal(p.logs.length, 1);
  assert.equal(record.outcome, 'timeout');
  assert.equal(record.code, 0);
  assert.equal(record.signal, null);
});

test('captures termination after a global timeout even before stream close', () => {
  const p = processProbe('commercial_version');
  p.start();
  p.observer.timeout();
  p.child.emit('exit', null, 'SIGKILL');
  assert.equal(p.records()[1].signal, 'SIGKILL');
  p.child.emit('close', null, 'SIGKILL');
  assert.equal(p.logs.length, 2);
});

test('a failed log sink does not stop launcher listeners or leave diagnostic listeners', () => {
  const p = processProbe('auth_package', () => { throw new Error('sink closed'); });
  const closed = new Promise(resolve => p.child.once('close', resolve));
  p.start();
  p.close(9);
  assert.equal(p.logs.length, 1);
  assert.deepEqual(p.child.eventNames(), []);
  assert.deepEqual(p.child.stdout.eventNames(), []);
  assert.deepEqual(p.child.stderr.eventNames(), []);
  return closed.then(code => assert.equal(code, 9));
});

for (const [line, category] of [
  ['wget: Failed to fetch https://repo.invalid/apache-maven.zip', 'wrapper'],
  ['[ERROR] PluginResolutionException: No plugin found for prefix dependency', 'resolution'],
  ['[ERROR] Could not resolve dependencies for project example', 'resolution'],
  ['[ERROR] COMPILATION ERROR : cannot find symbol', 'compilation'],
  ['[ERROR] PKIX path building failed: SSLHandshakeException', 'network'],
  ['[ERROR] java.nio.file.AccessDeniedException: /private/pom.xml', 'permissions'],
  ['[ERROR] No space left on device', 'resources'],
  ['[ERROR] Plugin returned an arbitrary message', 'unknown'],
  ['[ERROR] Could not resolve dependencies: Could not transfer artifact', 'unknown'],
]) {
  test(`classifies Maven output as ${category} without echoing the input: ${line.split(':')[0]}`, () => {
    const p = processProbe();
    p.start();
    p.output('stderr', line);
    p.close(1);
    assert.equal(p.records()[0].firstError, category);
    assert.ok(!p.logs[0].includes(line));
  });
}

test('records the first useful error and never emits secrets or arbitrary metadata', () => {
  const p = processProbe('commercial_package');
  const secrets = ['user:credential', 'eyJhbGciOiJub25lIn0.eyJzdWIiOiJ0ZXN0In0.signature',
    'token-synthetic', 'SECRET_VARIABLE', 'C:\\Users\\private', '/local/private', 'https://private.invalid'];
  p.start();
  p.output('stdout', '[INFO] --- compiler:3.14.1:testCompile (default) @ backend ---\n');
  p.output('stderr', '\u001b[31m[ERROR] Plugin failure: ' + secrets.join(' ') + '\r\n');
  p.output('stderr', '[ERROR] Connection re');
  p.output('stderr', 'set to https://private.invalid/?token=token-synthetic\u001b[0m\n');
  p.output('stderr', '[ERROR] OutOfMemoryError\n');
  p.close(1);
  const [record] = p.records();
  assert.equal(record.firstError, 'network');
  assert.equal(record.lastPhase, 'test_compile');
  for (const secret of secrets) assert.ok(!p.logs[0].includes(secret));
  assert.ok(!p.logs[0].includes('\u001b'));
});

test('rejects truncated lines, including a misleading error in the retained prefix', () => {
  const p = processProbe();
  p.start();
  p.output('stderr', '[ERROR] Compilation failure: ' + 'é'.repeat(1100));
  p.output('stderr', 'hidden-token\n');
  p.close(1);
  assert.equal(p.records()[0].firstError, 'unknown');
  assert.doesNotMatch(p.logs[0], /hidden-token/);
});

test('accepts an exact 2 KiB line and recovers framing after extensive output', () => {
  const p = processProbe();
  p.start();
  const exact = '[ERROR] Permission denied: ';
  for (let chunk = 0; chunk < 32; chunk++) p.output('stderr', 'S'.repeat(32 * 1024));
  p.output('stderr', '\n' + exact.padEnd(2048, 'x') + '\n');
  p.close(1);
  assert.equal(p.logs.length, 1);
  assert.equal(p.records()[0].firstError, 'permissions');
});
