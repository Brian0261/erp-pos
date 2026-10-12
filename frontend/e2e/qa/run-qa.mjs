import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { cp, mkdtemp, rm, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import policy from './safety-policy.cjs';
const { rejectInherited, verifyIdentity, verifyResults, verifyContainer, verifyCleanup } = policy;

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const root = resolve(frontend, '..');
const DIAG = '/api/v1/health/e2e-identity';
const RUN_LABEL = 'inktoy.qa.run';
const secret = () => randomBytes(32).toString('hex');
const assert = (condition, code) => { if (!condition) throw new Error(code); };
const delay = ms => new Promise(r => setTimeout(r, ms));
const log = message => console.log(`[QA] ${message}`);
const activeChildren = new Set();
let stopping = false, cleaning = false;


function reportResult(result, mode, failureCode) {
  let report;
  try { report=JSON.parse(result.stdout); } catch { throw new Error(failureCode+':INVALID_REPORT'); }
  // Never dump Playwright errors, stdout or attachments: they may hold form values.
  const categories=['EACCES','EROFS','ENOENT','Cannot find module','SyntaxError','not a function','No tests found','did not expect','browserType.launch','QA_ISOLATED_RUN_REQUIRED','does not provide an export','require()','import.meta','crashpad_handler','Missing X server','DISPLAY','Target page, context or browser has been closed'];
  function failures(suites=[]) { for(const suite of suites) {
    for(const spec of suite.specs??[]) for(const test of spec.tests??[])
      if(test.status!=='expected') {
        log('FAILED SPEC: '+String(spec.file).split('/').pop()+':'+spec.line+' ['+test.status+']');
        for(const result of test.results??[]) for(const error of result.errors??[]) {
          const description=String(error.message??'')+String(error.stack??'');
          log('FAILURE CATEGORY: '+categories.filter(c=>description.includes(c)).join(','));
        }
      }
    failures(suite.suites);
  } }
  if(result.code!==0) {
    failures(report.suites);
    for(const error of report.errors??[]) {
      const description=String(error.message??'')+String(error.stack??'');
      log('REPORT ERROR: '+categories.filter(c=>description.includes(c)).join(',')+' at '+(error.location?.file?.split('/').pop()??'unknown')+':'+(error.location?.line??0));
    }
  }
  assert(result.code===0,failureCode);
  return verifyResults(report,mode);
}


function command(file, args, options = {}) {
  if (stopping && !cleaning) return Promise.reject(new Error('QA_INTERRUPTED'));
  return new Promise((resolvePromise, reject) => {
    const child = spawn(file, args, { cwd: options.cwd ?? root, env: options.env ?? process.env,
      shell: options.shell ?? false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    activeChildren.add(child);
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    const timer = setTimeout(() => { child.kill(); reject(new Error('QA_COMMAND_TIMEOUT')); }, options.timeout ?? 120000);
    child.on('error', () => { clearTimeout(timer); reject(new Error('QA_COMMAND_START_FAILED')); });
    child.on('close', code => { activeChildren.delete(child); clearTimeout(timer); resolvePromise({ code, stdout, stderr }); });
  });
}

async function checked(file, args, options) {
  const result = await command(file, args, options);
  assert(result.code === 0, 'QA_TOOL_FAILED:' + file + ':' + (args[0] ?? ''));
  return result.stdout.trim();
}
const docker = (args, options) => checked('docker', args, options);
const inspect = async id => JSON.parse(await docker(['inspect', id]))[0];

async function main() {
  rejectInherited(process.env);
  assert(process.version === 'v22.23.3', 'QA_NODE_VERSION_REQUIRED_22_23_3');
  assert(await checked(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['--version'], { shell: process.platform === 'win32' }) === '10.9.9', 'QA_NPM_VERSION_REQUIRED_10_9_9');
  assert((await docker(['version', '--format', '{{.Server.Os}}'])) === 'linux', 'QA_LINUX_DOCKER_REQUIRED');
  const endpoint = await docker(['context', 'inspect', '--format', '{{(index .Endpoints "docker").Host}}']);
  assert(endpoint.startsWith('npipe:') || endpoint.startsWith('unix:'), 'QA_LOCAL_DOCKER_REQUIRED');
  const runId = randomBytes(12).toString('hex');
  log('RUN '+runId);
  const database = 'qa_' + runId;
  const generated = { QA_RUN_ID: runId, QA_MARKER: secret(), QA_DB_NAME: database, QA_DB_USER: database,
    QA_DB_PASSWORD: secret(), E2E_QA_USER: database, E2E_QA_PASSWORD: secret(), QA_JWT_SECRET: secret() + secret() };
  const resources = [];
  const temp = await mkdtemp(join(tmpdir(), 'inktoy-e2e-' + runId + '-'));
  const image = 'inktoy-e2e-auth-tools:' + runId;
  let hostDecoy, primaryError, resultSummary;
  const stage = join(temp, 'frontend');
  const runEnv = { ...process.env, ...generated };
  async function create(role, imageRef, args, environment = {}) {
    const name = `inktoy-qa-${runId}-${role}`;
    const id = await docker(['create', '--name', name, '--label', `${RUN_LABEL}=${runId}`, '--label', `inktoy.qa.role=${role}`,
      ...Object.keys(environment).flatMap(key => ['--env', key]), ...args, imageRef], { env: {...runEnv, ...environment} });
    resources.push({ kind: 'container', id, role }); return id;
  }
  async function own(id, networkMode) {
    const info = await inspect(id);
    verifyContainer(info, runId, networkMode);
    return info;
  }
  async function execNode(id, code, extraEnv = {}) {
    return docker(['exec', ...Object.keys(extraEnv).flatMap(k => ['--env', k]), id, 'node', '--input-type=module', '-e', code],
      { env: {...runEnv, ...extraEnv}, timeout: 180000 });
  }
  async function http(id, url, options = {}) {
    const encoded = JSON.stringify({ url, options });
    return JSON.parse(await execNode(id, `const p=${encoded}; const r=await fetch(p.url,{...p.options,signal:AbortSignal.timeout(4000)}); console.log(JSON.stringify({status:r.status,headers:Object.fromEntries(r.headers),body:await r.text()}));`));
  }
  async function poll(action, timeout = 90000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) { if (stopping) throw new Error('QA_INTERRUPTED'); try { const value = await action(); if (value) return value; } catch {} await delay(500); }
    throw new Error('QA_READINESS_TIMEOUT');
  }
  try {
    log('PREPARATION: approved tools/images/dependencies; application processes have not started');
    await chmod(temp, 0o700);
    for (const file of ['package.json', 'package-lock.json', 'angular.json', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.spec.json', 'playwright.auth.config.ts', 'playwright.config.ts', 'proxy.conf.json', 'src'])
      await cp(join(frontend, file), join(stage, file), { recursive: true });
    for (const folder of ['qa', 'fixtures', 'guards', 'helpers', 'setup', 'specs'])
      await cp(join(frontend, 'e2e', folder), join(stage, 'e2e', folder), { recursive: true });
    await docker(['build', '--label', `${RUN_LABEL}=${runId}`, '-t', image, '-f', join(stage, 'e2e/qa/Dockerfile'), stage], { timeout: 900000 });
    const runtimeImage = await docker(['image', 'inspect', image, '--format', '{{.Id}}']);
    for (const name of ['postgres:16-alpine', 'eclipse-temurin:17-jdk-jammy']) {
      if ((await command('docker', ['image', 'inspect', name])).code !== 0) await docker(['pull', name], { timeout: 600000 });
    }
    const pgImage = await docker(['image', 'inspect', 'postgres:16-alpine', '--format', '{{.Id}}']);
    const javaImage = await docker(['image', 'inspect', 'eclipse-temurin:17-jdk-jammy', '--format', '{{.Id}}']);
    await checked(process.platform === 'win32' ? 'mvnw.cmd' : './mvnw', ['-B', '-DskipTests', 'package', 'dependency:copy-dependencies', '-DincludeScope=test', '-DoutputDirectory=target/e2e-deps'],
      { cwd: join(root, 'backend'), shell: process.platform === 'win32', timeout: 600000 });
    const jarEntries = await checked('jar', ['tf', join(root, 'backend/target/backend-0.0.1-SNAPSHOT.jar')]);
    assert(!jarEntries.includes('/e2e/') && !jarEntries.includes('E2eQa'), 'QA_CLASSES_IN_PRODUCTION_ARTIFACT');
    for (const folder of ['classes', 'test-classes', 'e2e-deps']) await cp(join(root, 'backend/target', folder), join(temp, 'backend', folder), { recursive: true });
    log('PREPARATION PASS; production artifact excludes QA classes');

    const hardened = ['--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--read-only'];
    const anchor = await create('namespace', runtimeImage, ['--network', 'none', ...hardened]);
    await own(anchor, 'none'); await docker(['start', anchor]);
    const networkMode = 'container:' + anchor;
    const namespace = await docker(['exec', anchor, 'readlink', '/proc/1/ns/net']);
    async function proveNetwork(id) {
      await own(id, id === anchor ? 'none' : networkMode);
      assert(await docker(['exec', id, 'readlink', '/proc/1/ns/net']) === namespace, 'QA_NETWORK_NAMESPACE_MISMATCH');
      const devices = await docker(['exec', id, 'cat', '/proc/net/dev']);
      assert(devices.split('\n').filter(line => line.includes(':')).every(line => line.trim().startsWith('lo:')), 'NETWORK_ISOLATION_NOT_PROVEN');
      const routes = await docker(['exec', id, 'cat', '/proc/net/route']);
      assert(routes.trim().split('\n').length === 1, 'NETWORK_ISOLATION_NOT_PROVEN');
    }
    await proveNetwork(anchor);
    // Controlled host decoy: confirms host loopback is not the shared QA loopback.
    hostDecoy = createServer((_q, response) => response.end(runId));
    await new Promise(resolveListen => hostDecoy.listen(0, '127.0.0.1', resolveListen));
    const decoyPort = hostDecoy.address().port;
    const seen = await fetch(`http://127.0.0.1:${decoyPort}`).then(r => r.text());
    assert(seen === runId, 'QA_DECOY_IDENTITY_REJECTED');
    await execNode(anchor, `import net from 'node:net'; await new Promise((ok,fail)=>{const s=net.connect(${decoyPort},'127.0.0.1'); s.setTimeout(2000); s.on('connect',()=>{s.destroy();fail(Error('HOST_REACHABLE'))}); s.on('error',ok); s.on('timeout',()=>{s.destroy();ok()});});`);
    // A second owned namespace is the external decoy. No production destination is probed.
    const decoyNetwork = await docker(['network', 'create', '--internal', '--label', `${RUN_LABEL}=${runId}`, 'inktoy-qa-decoy-' + runId]);
    resources.push({ kind: 'network', id: decoyNetwork });
    const decoy = await create('decoy', runtimeImage, ['--network', decoyNetwork, ...hardened]);
    await docker(['start', decoy]);
    await docker(['exec', '-d', decoy, 'node', '-e', `require('http').createServer((q,r)=>r.end('${runId}')).listen(19090,'0.0.0.0')`]);
    const decoyInfo = await inspect(decoy);
    const decoyIp = Object.values(decoyInfo.NetworkSettings.Networks)[0].IPAddress;
    await poll(async () => (await http(decoy, 'http://127.0.0.1:19090')).body === runId);
    await execNode(anchor, `import net from 'node:net'; await new Promise((ok,fail)=>{const s=net.connect(19090,${JSON.stringify(decoyIp)});s.setTimeout(2000);s.on('connect',()=>{s.destroy();fail(Error('EXTERNAL_REACHABLE'))});s.on('error',ok);s.on('timeout',()=>{s.destroy();ok()});});`);
    log('NETWORK PASS: only loopback, no routes, host and external controlled decoys unreachable');

    // A stopped, owned container is inspected before PostgreSQL's own initialization.
    const pgName = `inktoy-qa-${runId}-postgres`;
    const pgId = await docker(['create', '--name', pgName, '--label', `${RUN_LABEL}=${runId}`, '--label', 'inktoy.qa.role=postgres',
      '--network', networkMode, ...hardened, '--user', 'postgres', '--env', 'POSTGRES_DB', '--env', 'POSTGRES_USER', '--env', 'POSTGRES_PASSWORD',
      '--tmpfs', '/var/lib/postgresql/data:rw,nosuid,noexec,size=512m,uid=70,gid=70,mode=0700',
      '--tmpfs', '/var/run/postgresql:rw,nosuid,noexec,uid=70,gid=70,mode=0700', pgImage, 'postgres', '-c', 'listen_addresses=127.0.0.1',
      '-c', `inktoy.qa_run_id=${runId}`, '-c', `inktoy.qa_marker=${generated.QA_MARKER}`],
      { env: {...runEnv, POSTGRES_DB: database, POSTGRES_USER: database, POSTGRES_PASSWORD: generated.QA_DB_PASSWORD} });
    resources.push({kind:'container', id:pgId, role:'postgres'});
    await own(pgId, networkMode); await docker(['start', pgId]); await proveNetwork(pgId);
    const sql = "select json_build_object('database',current_database(),'user',current_user,'marker',current_setting('inktoy.qa_marker'),'runId',current_setting('inktoy.qa_run_id'),'systemId',system_identifier::text,'address',host(inet_server_addr()),'port',inet_server_port()) from pg_control_system()";
    const pgIdentity = await poll(async () => JSON.parse(await docker(['exec', '--env', 'PGPASSWORD', pgId, 'psql', '-h', '127.0.0.1', '-U', database, '-d', database, '-tAc', sql], {env:{...runEnv,PGPASSWORD:generated.QA_DB_PASSWORD}})));
    for (const [field,value] of Object.entries({database,user:database,marker:generated.QA_MARKER,runId,address:'127.0.0.1',port:5432}))
      assert(pgIdentity[field]===value,'QA_DATABASE_IDENTITY_REJECTED:'+field);
    generated.QA_SYSTEM_ID = pgIdentity.systemId;
    const expected = {runId, database, systemId:pgIdentity.systemId};
    log('DATABASE PASS: owned container, namespace, random database/user/marker and cluster system ID matched before Flyway');

    // No application is allowed to start on an already occupied QA namespace port.
    await execNode(anchor, `import net from 'node:net'; for(const port of [8080,4201]) await new Promise((ok,fail)=>{const s=net.createServer();s.on('error',()=>fail(Error('QA_PORT_OCCUPIED')));s.listen(port,'127.0.0.1',()=>s.close(ok));});`);
    async function newBackend(role, configuration) {
      const id = await docker(['create', '--name', `inktoy-qa-${runId}-${role}`, '--label', `${RUN_LABEL}=${runId}`,
      '--network', networkMode, ...hardened, '--user', '1000:1000', '--tmpfs', '/tmp:rw,nosuid,size=128m,uid=1000,gid=1000',
      '--mount', `type=bind,source=${join(temp,'backend')},target=/qa,readonly`,
      ...Object.keys(configuration).flatMap(k=>['--env',k]), javaImage, 'java', '-cp', '/qa/classes:/qa/test-classes:/qa/e2e-deps/*', 'com.erppos.backend.e2e.E2eQaApplication'],
      {env:{...process.env,...configuration}});
      resources.push({kind:'container',id,role}); await own(id,networkMode); return id;
    }
    for(const [role,configuration] of [
      ['bad-marker',{...generated,QA_MARKER:secret()}],
      ['bad-datasource',{...generated,QA_DATASOURCE_URL:'jdbc:postgresql://qa-decoy.invalid/forbidden'}]
    ]) {
      const rejected=await newBackend(role,configuration);await docker(['start',rejected]);
      assert(await docker(['wait',rejected],{timeout:30000})==='1','QA_NEGATIVE_STARTUP_ACCEPTED');
      const rejectedLog=await command('docker',['logs',rejected]);
      assert(rejectedLog.code===0 && (rejectedLog.stdout+rejectedLog.stderr).includes('QA_BACKEND_STARTUP_REJECTED'),'QA_NEGATIVE_STARTUP_UNPROVEN');
    }
    const untouched=await docker(['exec','--env','PGPASSWORD',pgId,'psql','-h','127.0.0.1','-U',database,'-d',database,'-tAc',"select count(*) from pg_tables where schemaname='public'"],{env:{...runEnv,PGPASSWORD:generated.QA_DB_PASSWORD}});
    assert(untouched==='0','QA_MIGRATION_BEFORE_ATTESTATION');
    log('NEGATIVE STARTUP PASS: wrong marker/datasource rejected; public schema still empty');
    const backend = await newBackend('backend',generated);
    await own(backend,networkMode); await docker(['start',backend]); await proveNetwork(backend);
    const direct = await poll(async()=>{const r=await http(anchor,'http://127.0.0.1:8080'+DIAG); return r.status===200?JSON.parse(r.body):false;});
    verifyIdentity(direct,expected);
    const runtimeEnv = {QA_RUN_ID:runId, QA_SYSTEM_ID:expected.systemId, QA_DB_NAME:database,
      E2E_QA_USER:generated.E2E_QA_USER,E2E_QA_PASSWORD:generated.E2E_QA_PASSWORD,
      QA_JWT_SECRET:generated.QA_JWT_SECRET, QA_DECOY_IP:decoyIp, QA_HOST_DECOY_PORT:String(decoyPort),
      HOME:'/tmp',XDG_CONFIG_HOME:'/tmp/.config',XDG_CACHE_HOME:'/tmp/.cache'};
    const browser = await create('browser',runtimeImage,['--network',networkMode,...hardened,'--shm-size','256m',
      '--tmpfs','/tmp:rw,nosuid,size=512m,uid=1001,gid=1001', '--tmpfs','/qa-run:rw,nosuid,noexec,size=128m,uid=1001,gid=1001,mode=0700',
      '--tmpfs','/app/.angular:rw,nosuid,size=512m,uid=1001,gid=1001'],runtimeEnv);
    await own(browser,networkMode);await docker(['start',browser]);await proveNetwork(browser);
    await execNode(browser, `import fs from 'node:fs';fs.writeFileSync('/qa-run/proxy.json',JSON.stringify({'/api':{target:'http://127.0.0.1:8080',changeOrigin:false,headers:{'X-QA-Proxy-Run':process.env.QA_RUN_ID}}}),{mode:0o600});`);
    await docker(['exec','-d',browser,'node','node_modules/@angular/cli/bin/ng.js','serve','--host','127.0.0.1','--port','4201','--proxy-config','/qa-run/proxy.json','--live-reload=false','--hmr=false']);
    const proxied = await poll(async()=>{const r=await http(browser,'http://127.0.0.1:4201'+DIAG);return r.status===200?JSON.parse(r.body):false;},180000);
    verifyIdentity(proxied,expected,true); assert(proxied.commercialRows===0 && Number(proxied.stock)===10,'QA_FIXTURE_BASELINE_INVALID');
    log('BACKEND/PROXY PASS: effective identity, datasource, filter, process and synthetic baseline verified');
    // The deliberate mutation probe is unauthenticated and must be rejected before business code.
    const denied = await http(browser,'http://127.0.0.1:4201/api/v1/sales',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
    assert(denied.status===405 && denied.headers['x-qa-no-write']==='enforced','QA_FILTER_NOT_ENFORCED');
    const safety = await command('docker',['exec',browser,'node','node_modules/@playwright/test/cli.js','test','--config=playwright.auth.config.ts','--project=safety','--reporter=json'],{timeout:240000});
    const safetyCount=reportResult(safety,'safety','QA_NEGATIVE_TESTS_FAILED');
    log(`SAFETY PASS: ${safetyCount} negative tests; backend mutation rejected before business services`);
    const baseline = JSON.parse((await http(browser,'http://127.0.0.1:4201'+DIAG)).body);
    assert(baseline.violations===1,'QA_UNEXPECTED_PRE_GATE_VIOLATION');
    const headed=process.argv.includes('--headed');
    const gate=await command('docker',['exec',browser,...(headed?['xvfb-run','-a']:[]),'node','node_modules/@playwright/test/cli.js','test','--config=playwright.auth.config.ts','--project=public','--project=authenticated','--reporter=json',...(headed?['--headed']:[])],{timeout:240000});
    reportResult(gate,'gate','QA_AUTHENTICATED_GATE_FAILED');
    const final=JSON.parse((await http(browser,'http://127.0.0.1:4201'+DIAG)).body);
    verifyIdentity(final,expected,true);
    assert(final.violations===baseline.violations && final.commercialRows===0 && Number(final.stock)===10,'QA_POSTCONDITION_FAILED');
    await proveNetwork(browser);await proveNetwork(backend);await proveNetwork(pgId);
    resultSummary=`3 PASS / 0 FAIL / 0 SKIPPED; setup 1 PASS; safety ${safetyCount} PASS`;
    log(resultSummary);
    if(process.argv.includes('--regression')) {
      const regression=await create('regression',runtimeImage,['--network','none',...hardened,'--shm-size','256m',
        '--tmpfs','/tmp:rw,nosuid,size=512m,uid=1001,gid=1001','--tmpfs','/qa-run:rw,exec,nosuid,size=512m,uid=1001,gid=1001,mode=0700',
        '--tmpfs','/app/.angular:rw,nosuid,size=512m,uid=1001,gid=1001',
        '--tmpfs','/app/e2e/test-results:rw,nosuid,size=64m,uid=1001,gid=1001',
        '--tmpfs','/app/e2e/playwright-report:rw,nosuid,size=64m,uid=1001,gid=1001'],
        {HOME:'/tmp',XDG_CONFIG_HOME:'/tmp/.config',XDG_CACHE_HOME:'/tmp/.cache'});
      await own(regression,'none');await docker(['start',regression]);
      await execNode(regression,`import os from 'node:os';if(Object.values(os.networkInterfaces()).flat().some(a=>!a.internal))throw Error('NETWORK_ISOLATION_NOT_PROVEN');`);
      // Container-only launch shim; Karma/Jasmine configuration remains unchanged.
      await execNode(regression,`import fs from 'node:fs';import {chromium} from 'playwright';fs.writeFileSync('/qa-run/chrome',['#!/bin/sh','exec '+chromium.executablePath()+' --no-sandbox "$@"',''].join(String.fromCharCode(10)),{mode:0o700});`);
      const unit=await command('docker',['exec','--env','CHROME_BIN=/qa-run/chrome',regression,'npm','test'],{timeout:240000});
      // This separate namespace has no credentials/session/backend; show tool error lines only.
      if(unit.code!==0) for(const line of (unit.stdout+unit.stderr).split('\n').filter(l=>/ERROR|Error:|EACCES|EROFS|ENOENT|ChromeHeadless|Cannot/.test(l)).slice(-12)) log(line.replace(/\u001b\[[0-9;]*m/g,''));
      assert(unit.code===0,'QA_ANGULAR_UNIT_REGRESSION');
      const total=(unit.stdout+unit.stderr).match(/TOTAL: \d+ SUCCESS/g)?.at(-1);
      assert(total,'QA_ANGULAR_UNIT_COUNT_MISSING');log('REGRESSION PASS: Angular '+total);
      await docker(['exec',regression,'npm','run','build','--','--output-path=/qa-run/dist'],{timeout:240000});log('REGRESSION PASS: Angular build');
      // Playwright clears its output directory. Keep it below tmpfs, not at a mount root.
      const series=await command('docker',['exec',regression,'node','node_modules/@playwright/test/cli.js','test','e2e/specs/billing-series-concurrency.spec.ts','--workers=1','--reporter=json','--output=/qa-run/series-results'],{timeout:240000});
      assert(reportResult(series,'series','QA_SERIES_REGRESSION')===6,'QA_SERIES_COUNT');log('REGRESSION PASS: billing series 6/6');
    }
  } catch(error) {
    primaryError=error;
    const backend=resources.find(r=>r.role==='backend');
    if(backend) {
      const logs=await command('docker',['logs',backend.id]).catch(()=>null);
      for(const line of ((logs?.stdout??'')+(logs?.stderr??'')).split('\n'))
        if(/^QA_(BACKEND_|CAUSE_TYPE |SOURCE )/.test(line)) log(line.trim());
    }
  }
  finally {
    cleaning=true;
    if(hostDecoy) await new Promise(resolveClose=>hostDecoy.close(resolveClose));
    const failures=[];
    // Recover resources created just before a CLI timeout/signal, before their ID was recorded.
    try {
      for(const [kind,args] of [['container',['ps','-aq']],['network',['network','ls','-q']]]) {
        const found=await docker([...args,'--filter','label='+RUN_LABEL+'='+runId]);
        for(const id of found.split(/\s+/).filter(Boolean)) {
          const known=resources.some(r=>r.kind===kind && (r.id===id || r.id.startsWith(id)));
          if(!known) resources.push({kind,id,role:'recovered-'+kind});
        }
      }
    } catch { failures.push('ownership-inventory'); }
    for(const resource of resources.reverse()) {
      try {
        if(resource.kind==='container') {
          const info=await inspect(resource.id); assert(info.Config.Labels?.[RUN_LABEL]===runId,'QA_CLEANUP_OWNERSHIP_REJECTED');
          await docker(['rm','-f','-v',resource.id]);
          assert((await command('docker',['inspect',resource.id])).code!==0,'QA_CONTAINER_REMAINS');
        } else {
          const info=JSON.parse(await docker(['network','inspect',resource.id]))[0];
          assert(info.Labels?.[RUN_LABEL]===runId,'QA_CLEANUP_OWNERSHIP_REJECTED');await docker(['network','rm',resource.id]);
        }
      } catch { failures.push(resource.role??resource.kind); }
    }
    const imageInfo=await command('docker',['image','inspect',image]);
    if(imageInfo.code===0) { try {
      assert(JSON.parse(imageInfo.stdout)[0].Config.Labels?.[RUN_LABEL]===runId,'QA_IMAGE_OWNERSHIP_REJECTED');
      await docker(['image','rm',image]);
    } catch { failures.push('tools-image'); } }
    // Explicit checked absolute path before recursive removal; never use global cleanup.
    assert(resolve(temp).startsWith(resolve(tmpdir())+sep) && temp.includes(runId),'QA_TEMP_OWNERSHIP_REJECTED');
    try { await rm(temp,{recursive:true,force:true}); } catch { failures.push('temporary-directory'); }
    verifyCleanup(failures);
    log('CLEANUP PASS: only owned containers/network/image/temp removed; sessions existed only in private tmpfs');
  }
  if(primaryError) throw primaryError;
  return resultSummary;
}

if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  assert(process.argv.slice(2).every(a=>['--headed','--regression'].includes(a)) && new Set(process.argv.slice(2)).size===process.argv.length-2,'QA_ARGUMENT_OVERRIDE_FORBIDDEN');
  for(const signal of ['SIGINT','SIGTERM']) process.once(signal,()=>{stopping=true;for(const child of activeChildren)child.kill();});
  main().catch(error=>{console.error('[QA] '+(/^QA_|^UNSAFE_|^NETWORK_/.test(error.message)?error.message:'QA_FAILED_SANITIZED'));process.exitCode=1;});
}
