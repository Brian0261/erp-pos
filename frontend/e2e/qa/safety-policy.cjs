// Shared pure fail-closed policies; CommonJS also supports Playwright's TS loader.
const RUN_LABEL = 'inktoy.qa.run';
const assert = (condition, code) => { if (!condition) throw new Error(code); };

function rejectInherited(env) {
  for (const key of Object.keys(env)) {
    if (/^(E2E_|QA_|SPRING_|DB_|JWT_|BILLING_|PGHOST|PGPORT|PGDATABASE|PGUSER|PGPASSWORD|AWS_ACCESS_KEY|AWS_SECRET|AWS_SESSION)/i.test(key)
        || ['NODE_OPTIONS', 'JAVA_TOOL_OPTIONS', '_JAVA_OPTIONS', 'DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH'].includes(key))
      throw new Error('UNSAFE_INHERITED_CONFIGURATION:' + key);
  }
}

function verifyIdentity(data, expected, proxy = false) {
  assert(data.runId === expected.runId && data.database === expected.database && data.dbUser === expected.database
    && data.systemId === expected.systemId && data.markerMatched === true && data.ready === true
    && data.filter === 'enforced' && data.profile === 'e2e-qa' && data.pid === 1
    && (!proxy || data.proxyRunId === expected.runId), 'QA_RUNTIME_IDENTITY_REJECTED');
}

function verifyResults(report, mode = 'gate') {
  const tests = [];
  function walk(suites = []) { for (const suite of suites) { for (const spec of suite.specs ?? []) tests.push(...spec.tests.map(t => ({...t, title: spec.title}))); walk(suite.suites); } }
  walk(report.suites);
  assert(!report.errors?.length && tests.length > 0, 'QA_EMPTY_OR_INVALID_REPORT');
  assert(tests.every(t => t.status === 'expected' && t.results.length === 1 && t.results[0].status === 'passed'), 'QA_FAILED_OR_SKIPPED');
  if (mode === 'safety') assert(tests.length === 12, 'QA_SAFETY_TESTS_MISSING');
  if (mode === 'gate') {
    const required = tests.filter(t => ['public', 'authenticated'].includes(t.projectName));
    const titles = new Set([
      '@no-write login page loads without transactional requests',
      '@no-write authenticated POS shell loads without transactional requests',
      '@no-write authenticated POS interactions stop before transactional writes',
    ]);
    assert(required.length === 3 && new Set(required.map(t => t.title)).size === 3
      && required.every(t => titles.has(t.title))
      && tests.filter(t => t.projectName === 'setup').length === 1 && tests.length === 4, 'QA_REQUIRED_TESTS_MISSING');
  }
  return tests.length;
}

function verifyContainer(info, runId, networkMode) {
  assert(info.Config.Labels?.[RUN_LABEL] === runId && info.HostConfig.NetworkMode === networkMode
    && !info.HostConfig.Privileged && info.HostConfig.ReadonlyRootfs === true
    && info.HostConfig.CapDrop?.includes('ALL') && info.HostConfig.SecurityOpt?.some(v => v.startsWith('no-new-privileges'))
    && !Object.keys(info.HostConfig.PortBindings ?? {}).length
    && !info.Mounts.some(m => m.Type === 'volume' || m.Destination.includes('docker.sock')), 'QA_CONTAINER_OWNERSHIP_REJECTED');
}
function verifyCleanup(failures) {
  assert(failures.length === 0, 'QA_CLEANUP_FAILED:' + failures.join(','));
}

module.exports = { rejectInherited, verifyIdentity, verifyResults, verifyContainer, verifyCleanup };
