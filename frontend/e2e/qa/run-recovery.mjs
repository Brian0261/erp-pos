import { spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { cp, lstat, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve, join, sep, parse } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import policy from './safety-policy.cjs';

const frontend=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const root=resolve(frontend,'..');
const LABEL='inktoy.qa.run',DIAG='/api/v1/health/recovery-e2e';
const assert=(ok,code)=>{if(!ok)throw Error(code);};
const log=value=>console.log('[RECOVERY_QA] '+value);
const resources=[],children=new Set();let interrupted=false,cleaning=false;
export const REQUIRED_SCENARIOS=Object.freeze([
  ['pos-recovery-commercial.spec.ts','E2E 1 normal POS: preparation precedes one sale, stock/payment/cash persist'],
  ['pos-recovery-commercial.spec.ts','E2E 2 committed PREPARED response lost: no automatic checkout, same identity recovered'],
  ['pos-recovery-commercial.spec.ts','E2E 3 committed sale response lost: empty new browser context discovers same result without POST'],
  ['pos-recovery-commercial.spec.ts','E2E 4 two independent pending operations: select, cancel terminal identity and serve next purchase'],
  ['pos-recovery-commercial.spec.ts','E2E 5 user switch: foreign operation hidden and 404, original owner recovers'],
  ['pos-recovery-commercial.spec.ts','E2E 6 RECEIPT: original series/customer survive lost document response, DRAFT recovered once'],
  ['pos-recovery-commercial.spec.ts','E2E 6 INVOICE: original series/customer survive lost document response, DRAFT recovered once'],
  ['pos-recovery-commercial.spec.ts','E2E 6 quote consumer: real UI prepares then converts through original route once'],
  ['pos-recovery-ux.spec.ts','UX 01 modal stacking, ticket controls and focus at four viewport/sidebar configurations'],
  ['pos-recovery-ux.spec.ts','UX 01 uncertain preparation notice stays perceptible in the modal and closing preserves its identity'],
].map(row=>Object.freeze(row)));
const scenarioKey=(file,title)=>file.replaceAll('\\','/').split('/').at(-1)+'::'+title;
const APPROVED_PNGS=new Set([
  '01-desktop-checkout','01-desktop-success','02-preparation-uncertain-modal','02-preparation-uncertain-recovered',
  '03-sale-uncertain-modal','03-new-browser-recovered','04-small-pending-list','04-small-success','05-other-user-empty',
  '06-receipt-draft-recovered','06-invoice-draft-recovered','08-quote-conversion','ux01-before-stacking-reconstruction',
  'ux01-expanded-checkout','ux01-compact-checkout','ux01-small-checkout','ux01-mobile-checkout',
  'ux01-confirmation-above-checkout','ux01-other-full-cart-layer','ux01-uncertain-notice-visible',
].map(name=>name+'.png'));
const approvedPng=name=>APPROVED_PNGS.has(name)||/^failure-[a-zA-Z0-9_]+\.png$/.test(name);
function reportTests(report){
  assert(report&&Array.isArray(report.suites),'QA_INVALID_PLAYWRIGHT_REPORT');
  const tests=[];
  function walk(suites){for(const suite of suites){
    for(const spec of suite.specs??[]){assert(Array.isArray(spec.tests),'QA_INVALID_PLAYWRIGHT_REPORT');
      for(const t of spec.tests)tests.push({...t,title:spec.title,file:spec.file,line:spec.line});}
    walk(suite.suites??[]);
  }}walk(report.suites);return tests;
}
// Pure/exported so negative gate checks never launch Docker or commercial operations.
export function validateRecoveryReport(report,exitCode=0,selection='full'){
  const expected=REQUIRED_SCENARIOS.filter(([,title])=>selection==='full'||(selection==='pending-ux'&&/^(E2E 6 |UX 01 )/.test(title))
    ||(selection==='modal-ux'&&title.startsWith('UX 01 modal stacking')));
  assert(['full','pending-ux','modal-ux'].includes(selection),'QA_INVALID_SELECTION');
  const tests=reportTests(report),keys=tests.map(t=>scenarioKey(t.file,t.title));
  assert(exitCode===0&&Array.isArray(report.errors)&&report.errors.length===0,'QA_RECOVERY_E2E_NOT_PASSED');
  assert(tests.length===expected.length&&new Set(keys).size===expected.length
    &&expected.every(([file,title])=>keys.includes(scenarioKey(file,title))),'QA_REQUIRED_SCENARIOS_MISSING_OR_SUBSTITUTED');
  assert(tests.every(t=>t.status==='expected'&&t.expectedStatus==='passed'&&Array.isArray(t.results)&&t.results.length===1
    &&t.results[0].status==='passed'&&t.results[0].retry===0&&!(t.results[0].errors??[]).length),'QA_FAILED_SKIPPED_INTERRUPTED_OR_RETRIED');
  assert(report.stats?.expected===expected.length&&report.stats.unexpected===0&&report.stats.flaky===0&&report.stats.skipped===0,'QA_INCONSISTENT_REPORT_STATS');
  return tests;
}
export function validateRecoveryEvidence(summary,progress){
  assert(summary?.result==='PASS'&&summary.selection==='full'&&summary.isolation==='PASS'&&summary.cleanup==='PASS'
    &&summary.phase==='completed'&&summary.completedAt&&summary.fixtureIsolation?.uniqueResources===true
    &&summary.backendArtifact?.generatedThisRun===true&&/^[a-f0-9]{40}$/.test(summary.revision?.commit??'')
    &&Array.isArray(summary.tests)&&summary.tests.length===REQUIRED_SCENARIOS.length,'QA_FINAL_EVIDENCE_REQUIRED');
  assert(summary.schemaVersion===1&&/^[a-f0-9]{24}$/.test(summary.runId??'')&&Number.isFinite(Date.parse(summary.startedAt))
    &&Number.isFinite(Date.parse(summary.completedAt))&&Number.isFinite(summary.durationMs)
    &&summary.versions?.node==='v22.23.3'&&summary.versions.npm==='10.9.9'&&/^jar 17\./.test(summary.versions.jar??'')
    &&summary.versions.maven&&summary.versions.docker&&summary.versions.playwright==='Version 1.61.1'
    &&['tools','postgres','java'].every(k=>/^sha256:[a-f0-9]{64}$/.test(summary.versions.images?.[k]??''))
    &&/^[a-f0-9]{64}$/.test(summary.backendArtifact.sha256??'')&&summary.backendArtifact.sizeBytes>0,
    'QA_MANIFEST_METADATA_REQUIRED');
  const keys=summary.tests.map(t=>scenarioKey(t.file,t.title));
  assert(new Set(keys).size===REQUIRED_SCENARIOS.length&&REQUIRED_SCENARIOS.every(([f,t])=>keys.includes(scenarioKey(f,t)))
    &&summary.tests.every(t=>t.status==='expected'&&t.attempts===1&&t.result==='passed'&&t.retry===0&&t.errors.length===0)
    &&summary.errors.length===0,'QA_FINAL_RESULTS_REJECTED');
  assert(Array.isArray(progress)&&progress.length===REQUIRED_SCENARIOS.length
    &&new Set(progress.map(t=>t.title)).size===REQUIRED_SCENARIOS.length
    &&REQUIRED_SCENARIOS.every(([,title])=>progress.some(t=>t.title===title&&t.status==='passed'&&Array.isArray(t.errors)&&!t.errors.length)),
    'QA_PROGRESS_EVIDENCE_REQUIRED');
}
async function noLinks(path,recursive=false){
  const absolute=resolve(path);let parent=parse(absolute).root;
  for(const part of absolute.slice(parent.length).split(sep).filter(Boolean)){
    parent=join(parent,part);const info=await lstat(parent).catch(ex=>{if(ex.code==='ENOENT')return null;throw ex;});
    if(!info)return;assert(!info.isSymbolicLink(),'QA_LINK_OR_JUNCTION_REJECTED');
  }
  if(recursive&&(await lstat(absolute)).isDirectory())for(const entry of await readdir(absolute))await noLinks(join(absolute,entry),true);
}
export async function readRecoveryEvidence(directory){
  const expectedRoot=resolve(root,'backend/target/recovery-e2e');
  assert(dirname(dirname(directory))===expectedRoot&&/^[a-f0-9]{24}$/.test(parse(dirname(directory)).base)
    &&parse(directory).base==='evidence','QA_EVIDENCE_PATH_REJECTED');
  await noLinks(directory,true);
  const names=await readdir(directory);
  assert(names.includes('summary.json')&&names.includes('progress.json')
    &&names.every(n=>['summary.json','progress.json'].includes(n)||approvedPng(n)),'QA_EVIDENCE_ALLOWLIST_REJECTED');
  for(const name of names){const bytes=await readFile(join(directory,name));
    if(name.endsWith('.png'))assert(bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')),'QA_INVALID_PNG');
    else{
      const text=bytes.toString('utf8');JSON.parse(text);
      assert(!/eyJ[\w-]+\.[\w-]+\.[\w-]+|Bearer\s+(?!\[redacted\])[^\s"']+/.test(text),'QA_UNSANITIZED_EVIDENCE');
      const visit=value=>{if(value&&typeof value==='object')for(const [key,item]of Object.entries(value)){
        assert(!/password|cookie|authorization|jwt|secret|storageState|command_snapshot|receipt_intent/i.test(key),'QA_PRIVATE_EVIDENCE_FIELD');visit(item);}};
      visit(JSON.parse(text));
    }
  }
  const summary=JSON.parse(await readFile(join(directory,'summary.json'),'utf8'));
  assert(summary.runId===parse(dirname(directory)).base,'QA_EVIDENCE_RUN_MISMATCH');
  return {summary,progress:JSON.parse(await readFile(join(directory,'progress.json'),'utf8'))};
}
function command(file,args,{cwd=root,env=process.env,timeout=120000,shell=false}={}){
  if(interrupted&&!cleaning)throw Error('QA_INTERRUPTED');
  return new Promise((done,fail)=>{
    const child=spawn(file,args,{cwd,env,shell,windowsHide:true,stdio:['ignore','pipe','pipe']});children.add(child);
    let stdout='',stderr='';child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);
    const timer=setTimeout(()=>{child.kill();fail(Error('QA_COMMAND_TIMEOUT:'+file+':'+args[0]));},timeout);
    child.on('error',()=>{clearTimeout(timer);children.delete(child);fail(Error('QA_COMMAND_START_FAILED:'+file));});
    child.on('close',code=>{clearTimeout(timer);children.delete(child);done({code,stdout,stderr});});
  });
}
async function checked(file,args,options){const r=await command(file,args,options);assert(r.code===0,'QA_TOOL_FAILED:'+file+':'+args[0]);return r.stdout.trim();}
const docker=(args,options)=>checked('docker',args,options);
const inspect=async id=>JSON.parse(await docker(['inspect',id]))[0];
async function poll(action,timeout=120000){const until=Date.now()+timeout;while(Date.now()<until){if(interrupted)throw Error('QA_INTERRUPTED');try{const r=await action();if(r)return r;}catch{}await new Promise(r=>setTimeout(r,500));}throw Error('QA_READINESS_TIMEOUT');}

async function main(){
  const pendingUx=process.argv.length===3&&process.argv[2]==='--pending-ux';
  const modalUx=process.argv.length===3&&process.argv[2]==='--modal-ux';
  const selection=pendingUx?'pending-ux':modalUx?'modal-ux':'full';
  const runId=randomBytes(12).toString('hex'),secret=()=>randomBytes(32).toString('hex');
  const database='qa_'+runId;
  const generated={QA_RUN_ID:runId,QA_MARKER:secret(),QA_DB_NAME:database,QA_DB_USER:database,
    QA_DB_PASSWORD:secret(),E2E_QA_USER:database,E2E_QA_PASSWORD:secret(),QA_JWT_SECRET:secret()+secret()};
  const runEnv={...process.env,...generated};
  // Angular purges unknown cache folders on build/test. Keep the owned QA stage/evidence elsewhere.
  const qaRoot=join(root,'backend/target/recovery-e2e');
  const runDir=join(qaRoot,runId),stage=join(runDir,'stage'),artifacts=join(runDir,'evidence');
  await noLinks(qaRoot);
  await mkdir(artifacts,{recursive:true});const image='inktoy-recovery-qa-tools:'+runId;
  let decoy,error,anchor,browser,backend,dockerReady=false,timedOut=false,phaseStarted=Date.now();
  const started=Date.now(),summary={schemaVersion:1,runId,selection,revision:null,versions:{node:process.version},
    startedAt:new Date(started).toISOString(),phase:'preflight',phases:[],isolation:'NOT_STARTED',cleanup:'NOT_STARTED',result:'RUNNING',tests:[],errors:[]};
  const manifest=join(artifacts,'summary.json');
  const save=()=>writeFile(manifest,sanitize(JSON.stringify(summary,null,2)),{mode:0o600});
  async function phase(name){const now=Date.now();summary.phases.push({name:summary.phase,durationMs:now-phaseStarted});
    phaseStarted=now;summary.phase=name;await save();log('PHASE '+name);}
  const deadline=setTimeout(()=>{timedOut=true;interrupted=true;for(const c of children)c.kill();},35*60*1000);
  const hard=['--cap-drop','ALL','--security-opt','no-new-privileges','--read-only'];
  const execNode=(id,code)=>docker(['exec',id,'node','--input-type=module','-e',code],{timeout:180000});
  async function http(id,url,options={}){return JSON.parse(await execNode(id,`const p=${JSON.stringify({url,options})};const r=await fetch(p.url,{...p.options,signal:AbortSignal.timeout(4000)});console.log(JSON.stringify({status:r.status,headers:Object.fromEntries(r.headers),body:await r.text()}));`));}
  async function create(role,imageRef,args,env={}){
    const id=await docker(['create','--name',`inktoy-recovery-${runId}-${role}`,'--label',`${LABEL}=${runId}`,
      '--label','inktoy.qa.purpose=pos-recovery-a',...Object.keys(env).flatMap(k=>['--env',k]),...args,imageRef],{env:{...runEnv,...env}});
    resources.push({kind:'container',id,role});return id;
  }
  async function own(id,network){const info=await inspect(id);policy.verifyContainer(info,runId,network);
    assert(info.Mounts.every(m=>m.Type==='tmpfs'||(id===backend&&m.Type==='bind'&&m.Destination==='/qa'&&m.RW===false)),
      'QA_UNAPPROVED_MOUNT');}
  function identity(data,proxy=false){assert(data.runId===runId&&data.database===database&&data.dbUser===database&&data.systemId===generated.QA_SYSTEM_ID
    &&data.markerMatched===true&&data.ready===true&&data.filter==='recovery-enforced'&&data.pid===1&&(!proxy||data.proxyRunId===runId),'QA_RECOVERY_IDENTITY_REJECTED');}
  const sanitize=text=>{
    let value=text;for(const secret of [generated.E2E_QA_PASSWORD,generated.QA_DB_PASSWORD,generated.QA_MARKER,generated.QA_JWT_SECRET])value=value.replaceAll(secret,'[redacted]');
    return value.replace(/Bearer\s+[^\s"']+/g,'Bearer [redacted]').replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g,'[redacted-jwt]');
  };
  async function preserveBrowserEvidence(){
    if(!browser)return;
    const pictures=JSON.parse(await execNode(browser,"import fs from 'node:fs';console.log(JSON.stringify(fs.readdirSync('/qa-run/screenshots').filter(n=>/^[a-zA-Z0-9_-]+\\.png$/.test(n))));"));
    for(const name of pictures){assert(approvedPng(name),'QA_SCREENSHOT_NOT_APPROVED');
      const bytes=await execNode(browser,`import fs from 'node:fs';console.log(fs.readFileSync(${JSON.stringify('/qa-run/screenshots/'+name)}).toString('base64'));`);await writeFile(join(artifacts,name),Buffer.from(bytes,'base64'));}
    const progress=await execNode(browser,"import fs from 'node:fs';console.log(fs.existsSync('/qa-run/progress.json')?fs.readFileSync('/qa-run/progress.json','utf8'):'[]');");
    await writeFile(join(artifacts,'progress.json'),sanitize(progress));
  }
  try{
    await save();
    await writeFile(join(artifacts,'progress.json'),'[]',{mode:0o600});
    assert(process.argv.length===2||pendingUx||modalUx,'QA_ARGUMENT_OVERRIDE_FORBIDDEN');
    assert(!process.env.CI||selection==='full','QA_CI_FULL_SUITE_REQUIRED');policy.rejectInherited(process.env);
    summary.revision={commit:await checked('git',['rev-parse','HEAD']),dirty:!!(await checked('git',['status','--porcelain','--untracked-files=all']))};
    assert(process.version==='v22.23.3','QA_NODE_VERSION_REQUIRED');
    summary.versions.npm=await checked(process.platform==='win32'?'npm.cmd':'npm',['--version'],{shell:process.platform==='win32'});
    assert(summary.versions.npm==='10.9.9','QA_NPM_VERSION_REQUIRED');
    summary.versions.jar=await checked('jar',['--version']);assert(/^jar 17\./.test(summary.versions.jar),'QA_JAVA_17_REQUIRED');
    summary.versions.maven=(await checked(process.platform==='win32'?'mvnw.cmd':'./mvnw',['--version'],{cwd:join(root,'backend'),shell:process.platform==='win32'})).match(/Apache Maven [\d.]+/)?.[0];
    summary.versions.docker=await docker(['version','--format','{{.Server.Version}}']);
    assert(await docker(['version','--format','{{.Server.Os}}'])==='linux','QA_LINUX_DOCKER_REQUIRED');
    const endpoint=await docker(['context','inspect','--format','{{(index .Endpoints "docker").Host}}']);
    assert(endpoint.startsWith('npipe:')||endpoint.startsWith('unix:'),'QA_LOCAL_DOCKER_REQUIRED');
    dockerReady=true;
    await phase('preparation');
    log('RUN '+runId+'; PREPARATION (no application process started)');
    for(const name of ['package.json','package-lock.json','angular.json','tsconfig.json','tsconfig.app.json','proxy.conf.json','playwright.recovery.config.ts','src','e2e']){
      await noLinks(join(frontend,name),true);
      await cp(join(frontend,name),join(stage,name),{recursive:true});
    }
    await phase('tools-image');
    await docker(['build','--label',`${LABEL}=${runId}`,'-t',image,'-f',join(stage,'e2e/qa/Dockerfile'),stage],{timeout:900000});
    const tools=await docker(['image','inspect',image,'--format','{{.Id}}']);
    for(const name of ['postgres:16-alpine','eclipse-temurin:17-jdk-jammy'])if((await command('docker',['image','inspect',name])).code!==0)await docker(['pull',name],{timeout:600000});
    const pgImage=await docker(['image','inspect','postgres:16-alpine','--format','{{.Id}}']);
    const javaImage=await docker(['image','inspect','eclipse-temurin:17-jdk-jammy','--format','{{.Id}}']);
    summary.versions.images={tools,postgres:pgImage,java:javaImage};
    await phase('backend-package');
    const jarPath=join(root,'backend/target/backend-0.0.1-SNAPSHOT.jar');await noLinks(jarPath);
    const oldJar=await stat(jarPath).catch(ex=>{if(ex.code==='ENOENT')return null;throw ex;}),buildStarted=Date.now();
    // forceCreation prevents a pre-existing (possibly repackaged) JAR becoming an input.
    await checked(process.platform==='win32'?'mvnw.cmd':'./mvnw',['-B','-DskipTests','-Dmaven.jar.forceCreation=true','package','dependency:copy-dependencies','-DincludeScope=test','-DoutputDirectory=target/e2e-deps'],
      {cwd:join(root,'backend'),shell:process.platform==='win32',timeout:600000});
    const jarInfo=await stat(jarPath);
    assert(jarInfo.isFile()&&jarInfo.mtimeMs>=buildStarted-2000&&(!oldJar||jarInfo.mtimeMs!==oldJar.mtimeMs),'QA_FRESH_JAR_REQUIRED');
    summary.backendArtifact={generatedThisRun:true,sizeBytes:jarInfo.size,sha256:createHash('sha256').update(await readFile(jarPath)).digest('hex')};
    const entries=await checked('jar',['tf',jarPath]);
    assert(!entries.includes('/e2e/')&&!entries.includes('RecoveryQa'),'QA_CLASSES_IN_PRODUCTION_ARTIFACT');
    for(const folder of ['classes','test-classes','e2e-deps']){await noLinks(join(root,'backend/target',folder),true);
      await cp(join(root,'backend/target',folder),join(stage,'backend',folder),{recursive:true});}
    await noLinks(join(stage,'backend'),true);await phase('isolation');
    anchor=await create('namespace',tools,['--network','none',...hard]);await own(anchor,'none');await docker(['start',anchor]);
    const network='container:'+anchor,namespace=await docker(['exec',anchor,'readlink','/proc/1/ns/net']);
    async function prove(id){await own(id,id===anchor?'none':network);assert(await docker(['exec',id,'readlink','/proc/1/ns/net'])===namespace,'QA_NAMESPACE_MISMATCH');
      const devices=await docker(['exec',id,'cat','/proc/net/dev']);assert(devices.split('\n').filter(s=>s.includes(':')).every(s=>s.trim().startsWith('lo:')),'QA_NON_LOOPBACK_INTERFACE');
      assert((await docker(['exec',id,'cat','/proc/net/route'])).split('\n').filter(Boolean).length===1,'QA_EXTERNAL_ROUTE');}
    await prove(anchor);
    decoy=createServer((_q,r)=>r.end(runId));await new Promise(r=>decoy.listen(0,'127.0.0.1',r));
    const port=decoy.address().port;assert(await fetch('http://127.0.0.1:'+port).then(r=>r.text())===runId,'QA_HOST_DECOY_INVALID');
    await execNode(anchor,`import net from 'node:net';await new Promise((ok,fail)=>{const s=net.connect(${port},'127.0.0.1');s.setTimeout(2000);s.on('connect',()=>{s.destroy();fail(Error('HOST_REACHABLE'))});s.on('error',ok);s.on('timeout',()=>{s.destroy();ok()});});`);
    const pgId=await docker(['create','--name',`inktoy-recovery-${runId}-postgres`,'--label',`${LABEL}=${runId}`,'--label','inktoy.qa.purpose=pos-recovery-a',
      '--network',network,...hard,'--user','postgres','--env','POSTGRES_DB','--env','POSTGRES_USER','--env','POSTGRES_PASSWORD',
      '--tmpfs','/var/lib/postgresql/data:rw,nosuid,noexec,size=512m,uid=70,gid=70,mode=0700','--tmpfs','/var/run/postgresql:rw,nosuid,noexec,uid=70,gid=70,mode=0700',
      pgImage,'postgres','-c','listen_addresses=127.0.0.1','-c',`inktoy.qa_run_id=${runId}`,'-c',`inktoy.qa_marker=${generated.QA_MARKER}`],
      {env:{...runEnv,POSTGRES_DB:database,POSTGRES_USER:database,POSTGRES_PASSWORD:generated.QA_DB_PASSWORD}});
    resources.push({kind:'container',id:pgId,role:'postgres'});await own(pgId,network);await docker(['start',pgId]);await prove(pgId);
    async function sql(query){return docker(['exec','--env','PGPASSWORD',pgId,'psql','-h','127.0.0.1','-U',database,'-d',database,'-tAc',query],{env:{...runEnv,PGPASSWORD:generated.QA_DB_PASSWORD}});}
    const pg=await poll(async()=>JSON.parse(await sql("select json_build_object('database',current_database(),'user',current_user,'marker',current_setting('inktoy.qa_marker'),'runId',current_setting('inktoy.qa_run_id'),'systemId',system_identifier::text,'address',host(inet_server_addr()),'port',inet_server_port()) from pg_control_system()")));
    for(const [key,value]of Object.entries({database,user:database,marker:generated.QA_MARKER,runId,address:'127.0.0.1',port:5432}))assert(pg[key]===value,'QA_PG_IDENTITY_REJECTED:'+key);
    generated.QA_SYSTEM_ID=pg.systemId;assert(await sql("select count(*) from pg_tables where schemaname='public'")==='0','QA_FRESH_DATABASE_REQUIRED');
    log('ISOLATION PASS: network:none, loopback only, no routes/ports/volumes, host decoy unreachable; PostgreSQL label/marker/system ID matched before Flyway');
    await phase('backend-startup');
    backend=await docker(['create','--name',`inktoy-recovery-${runId}-backend`,'--label',`${LABEL}=${runId}`,'--label','inktoy.qa.purpose=pos-recovery-a',
      '--network',network,...hard,'--user','1000:1000','--tmpfs','/tmp:rw,nosuid,size=128m,uid=1000,gid=1000',
      '--mount',`type=bind,source=${join(stage,'backend')},target=/qa,readonly`,...Object.keys(generated).flatMap(k=>['--env',k]),
      javaImage,'java','-cp','/qa/classes:/qa/test-classes:/qa/e2e-deps/*','com.erppos.backend.e2e.RecoveryQaApplication'],{env:{...process.env,...generated}});
    resources.push({kind:'container',id:backend,role:'backend'});await own(backend,network);await docker(['start',backend]);await prove(backend);
    const direct=await poll(async()=>{const r=await http(anchor,'http://127.0.0.1:8080'+DIAG);return r.status===200?JSON.parse(r.body):false;});identity(direct);
    const env={QA_RUN_ID:runId,QA_DB_NAME:database,QA_SYSTEM_ID:pg.systemId,E2E_QA_USER:database,E2E_QA_PASSWORD:generated.E2E_QA_PASSWORD,
      HOME:'/tmp',XDG_CONFIG_HOME:'/tmp/.config',XDG_CACHE_HOME:'/tmp/.cache'};
    browser=await create('browser',tools,['--network',network,...hard,'--shm-size','256m',
      '--tmpfs','/tmp:rw,nosuid,size=512m,uid=1001,gid=1001','--tmpfs','/qa-run:rw,nosuid,size=256m,uid=1001,gid=1001,mode=0700',
      '--tmpfs','/app/.angular:rw,nosuid,size=512m,uid=1001,gid=1001'],env);
    await own(browser,network);await docker(['start',browser]);await prove(browser);
    await execNode(browser,`import fs from 'node:fs';fs.mkdirSync('/qa-run/screenshots',{recursive:true});fs.writeFileSync('/qa-run/proxy.json',JSON.stringify({'/api':{target:'http://127.0.0.1:8080',changeOrigin:false,headers:{'X-QA-Proxy-Run':${JSON.stringify(runId)}}}}),{mode:0o600});`);
    await docker(['exec','-d',browser,'node','node_modules/@angular/cli/bin/ng.js','serve','--host','127.0.0.1','--port','4201','--proxy-config','/qa-run/proxy.json','--live-reload=false','--hmr=false']);
    const proxied=await poll(async()=>{const r=await http(browser,'http://127.0.0.1:4201'+DIAG);return r.status===200?JSON.parse(r.body):false;},180000);identity(proxied,true);
    assert(proxied.cases.length===10&&Array.from({length:10},(_,i)=>`${generated.E2E_QA_USER}_${i+1}`).every(u=>proxied.cases.some(c=>c.username===u)),
      'QA_FIXTURE_CASES_MISSING');
    for(const key of ['username','actor_id','cash_id','product_id'])assert(new Set(proxied.cases.map(c=>c[key])).size===10,'QA_FIXTURE_RESOURCE_REUSED');
    for(const n of [9,10]){const state=JSON.parse((await http(browser,`http://127.0.0.1:4201${DIAG}/snapshot?case=${n}`)).body);
      assert(state.runId===runId&&state.cash_status==='OPEN'&&Number(state.sales)===0&&Number(state.payments)===0
        &&Number(state.movements)===0&&Number(state.stock)===100,'QA_UX_FIXTURE_NOT_FRESH');}
    summary.fixtureIsolation={commercial:[1,2,3,4,5,6,7,8],ux:[9,10],uniqueResources:true};
    const forbidden=await http(browser,'http://127.0.0.1:4201/api/v1/billing/documents/1/send',{method:'POST'});
    assert(forbidden.status===405&&forbidden.headers['x-qa-recovery']==='enforced','QA_FISCAL_SEND_NOT_BLOCKED');
    summary.isolation='PASS';
    summary.versions.playwright=await docker(['exec',browser,'node','node_modules/@playwright/test/cli.js','--version']);
    assert(summary.versions.playwright==='Version 1.61.1','QA_PLAYWRIGHT_VERSION_REQUIRED');
    await phase('commercial-tests');
    log('RUNTIME PASS: effective backend/proxy identity verified, 10 independent synthetic cashier fixtures; fiscal send denied');
    const result=await command('docker',['exec',browser,'node','node_modules/@playwright/test/cli.js','test','--config=playwright.recovery.config.ts','--reporter=json,./e2e/qa/recovery-reporter.ts',
      ...(pendingUx?['--grep','(E2E 6 |UX 01 )']:modalUx?['--grep','UX 01 modal stacking']:[])],{timeout:600000});
    let report;try{report=JSON.parse(result.stdout);}catch{throw Error('QA_INVALID_PLAYWRIGHT_REPORT');}
    const tests=reportTests(report);
    summary.tests=tests.map(t=>({title:t.title,file:t.file,status:t.status,attempts:t.results?.length,result:t.results?.[0]?.status,
      retry:t.results?.[0]?.retry,durationMs:(t.results??[]).reduce((sum,r)=>sum+(r.duration??0),0),
      errors:(t.results??[]).flatMap(r=>(r.errors??[]).map(e=>sanitize(e.message??'').slice(0,3500)))}));
    summary.errors.push(...(report.errors??[]).map(e=>sanitize(e.message??'').slice(0,3500)));await save();
    for(const t of summary.tests)log(`${t.status.toUpperCase()}: ${t.title}`);
    validateRecoveryReport(report,result.code,selection);
    const final=JSON.parse((await http(browser,'http://127.0.0.1:4201'+DIAG)).body);identity(final,true);assert(final.denied===1,'QA_UNEXPECTED_DENIED_REQUEST');
    log(`${tests.length}/${tests.length} tests PASS; final gate still requires evidence and cleanup`);
  }catch(ex){error=ex;
    summary.errors.push(timedOut?'QA_LAUNCHER_TIMEOUT':sanitize(/^(QA_|UNSAFE_)/.test(ex.message)?ex.message:'QA_FAILED_SANITIZED'));
    if(backend){const r=await command('docker',['logs',backend]).catch(()=>null);for(const line of((r?.stdout??'')+(r?.stderr??'')).split('\n'))if(/^QA_(RECOVERY_|CAUSE_TYPE)/.test(line))log(line.trim());}
  }finally{
    clearTimeout(deadline);cleaning=true;const failures=[];
    await phase('evidence-and-cleanup').catch(()=>summary.errors.push('QA_MANIFEST_WRITE_FAILED'));
    if(decoy)await new Promise(r=>decoy.close(r));
    try{await preserveBrowserEvidence();}catch{summary.errors.push('QA_BROWSER_EVIDENCE_UNAVAILABLE');}
    if(resources.length)try{const sample=await docker(['stats','--no-stream','--format','{{json .}}',...resources.map(r=>r.id)],{timeout:20000});
      summary.resourceSample={kind:'end-of-tests snapshot; not peak usage',observedAt:new Date().toISOString(),containers:sample.split('\n').filter(Boolean).map(line=>{
        const row=JSON.parse(line);return {cpu:row.CPUPerc,memory:row.MemUsage,memoryPercent:row.MemPerc,pids:row.PIDs};})};
    }catch{summary.resourceSample={kind:'unavailable; no usage claim'};}
    if(dockerReady)try{for(const id of(await docker(['ps','-aq','--filter','label='+LABEL+'='+runId])).split(/\s+/).filter(Boolean))if(!resources.some(r=>r.id.startsWith(id)))resources.push({kind:'container',id,role:'recovered'});}catch{failures.push('inventory');}
    for(const resource of resources.reverse())try{assert((await inspect(resource.id)).Config.Labels?.[LABEL]===runId,'QA_CLEANUP_OWNERSHIP_REJECTED');await docker(['rm','-f','-v',resource.id]);assert((await command('docker',['inspect',resource.id])).code!==0,'QA_RESOURCE_REMAINS');}catch{failures.push(resource.role);}
    if(dockerReady)try{const r=await command('docker',['image','inspect',image]);if(r.code===0){assert(JSON.parse(r.stdout)[0].Config.Labels?.[LABEL]===runId,'QA_IMAGE_OWNERSHIP_REJECTED');await docker(['image','rm',image]);}}catch{failures.push('tools-image');}
    try{assert(resolve(stage)===join(qaRoot,runId,'stage'),'QA_STAGE_OWNERSHIP_REJECTED');await noLinks(stage,true);await rm(stage,{recursive:true,force:true});}catch{failures.push('stage');}
    summary.cleanup=failures.length?'FAIL':'PASS';summary.errors.push(...failures.map(role=>'QA_CLEANUP_FAILED:'+role));
    if(interrupted&&!summary.errors.length)summary.errors.push(timedOut?'QA_LAUNCHER_TIMEOUT':'QA_INTERRUPTED');
    summary.result=!error&&!interrupted&&!summary.errors.length&&summary.isolation==='PASS'&&summary.cleanup==='PASS'?'PASS':'FAIL';
    summary.completedAt=new Date().toISOString();summary.durationMs=Date.now()-started;await phase('completed');await save();
    try{const evidence=await readRecoveryEvidence(artifacts);
      if(summary.result==='PASS'&&selection==='full')validateRecoveryEvidence(evidence.summary,evidence.progress);
    }catch(ex){summary.result='FAIL';summary.errors.push(/^(QA_|UNSAFE_)/.test(ex.message)?ex.message:'QA_EVIDENCE_REJECTED');await save();throw ex;}
    policy.verifyCleanup(failures);
    log('CLEANUP '+summary.cleanup+': only owned ephemeral resources and staged copies removed');log('EVIDENCE '+artifacts);
  }
  assert(summary.result==='PASS','QA_RECOVERY_GATE_FAILED');
  if(error)throw error;
}
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{interrupted=true;for(const c of children)c.kill();});
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)
  main().catch(error=>{console.error('[RECOVERY_QA] '+(/^(QA_|UNSAFE_)/.test(error.message)?error.message:'QA_FAILED_SANITIZED'));process.exitCode=1;});
