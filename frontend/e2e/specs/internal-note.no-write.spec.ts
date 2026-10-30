import { test, expect, Page } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { noteSale } from "../../src/app/features/sales/internal-note/note-test-data";

const ciSmoke = process.env["npm_lifecycle_event"] === "e2e:internal-note:ci";
const pdfFault = process.env["INKTOY_NOTE_QA_PDF_FAULT"];
if (pdfFault && (!ciSmoke || !["empty", "not-pdf", "truncated"].includes(pdfFault))) throw new Error("QA_NOTE_INVALID_FAULT_CONFIGURATION");
const evidence = path.join(os.tmpdir(), ciSmoke ? "inktoy-internal-note-ci/evidence" : "inktoy-note-1b-evidence");
const token = "synthetic-note-session";
const user = { id: "synthetic-note-owner", username: "cajero.sintetico", roles: ["CAJERO"], email: "synthetic@example.invalid" };
const ciCases = ["pos", "pdf", "denied", "retry", "session", "recover"] as const;
const ciPassed = new Set<string>();
const ciCase = (name: typeof ciCases[number]) => ({ tag: ["@internal-note-ci", "@internal-note-ci-" + name] });
test.describe.configure({ mode: "serial" });
test.afterEach(async ({}, info) => {
  if (ciSmoke && info.status === "passed") for (const name of ciCases)
    if (info.tags.includes("@internal-note-ci-" + name)) ciPassed.add(name);
});
test.afterAll(() => {
  if (ciSmoke) expect([...ciPassed].sort(), "El gate exige los seis casos completos, sin omisiones").toEqual([...ciCases].sort());
});
async function setup(page: Page, sale = noteSale(), denial = 0, uncertain = false, capturePdf = false) {
  const methods: string[] = [], errors: string[] = [], requests: string[] = [];
  await mkdir(evidence,{recursive:true});
  page.on("pageerror",e=>errors.push(e.message));
  page.context().on("page", opened => opened.on("pageerror",e=>errors.push(e.message)));
  page.context().on("request",request=>{
    requests.push(request.url());
    const pathname=new URL(request.url()).pathname;
    if (pathname.includes('/api/')) {
      methods.push(request.method()+" "+pathname);
      if (request.method()!=="GET") throw new Error("Unexpected commercial write: "+request.method()+" "+pathname);
    }
  });
  await page.addInitScript(({token,user,uncertain,capturePdf,pdfFault}) => {
    if (window !== window.top || location.protocol !== 'http:') return;
    localStorage.setItem("erp_pos_token",token);
    const op = "00000000-0000-4000-8000-000000000081";
    sessionStorage.setItem("erp_pos_sales_draft_v1",JSON.stringify({formatVersion:2,userId:user.id,cashRegisterSessionId:7,warehouseId:3,lastWarehouseId:3,code:"",query:"",searchResults:[],cart:[],payments:[],lastSaleId:81,
      ...(uncertain ? {pendingSaleRequest:{operationId:op,confirmedTotal:10,warehouseId:3,items:[],payments:[]},receiptRecovery:{version:1,operationId:op,userId:user.id,receiptType:"TICKET",payload:null,customerAddress:"",saleId:null,documentId:null,creationState:"NOT_STARTED"}} : {})}));
    const created = URL.createObjectURL.bind(URL), revoked = URL.revokeObjectURL.bind(URL);
    const active = new Set<string>(); Object.assign(window,{noteUrls:active});
    URL.createObjectURL = b => {
      if (b instanceof Blob && b.type === 'application/pdf') {
        // Test-only corruption exercises the real download guard; it never makes an invalid file pass.
        if (pdfFault === 'empty') b = new Blob([],{type:'application/pdf'});
        else if (pdfFault === 'not-pdf') b = new Blob(['<html>Not a PDF</html>'.repeat(100)],{type:'application/pdf'});
        else if (pdfFault === 'truncated') b = b.slice(0,Math.max(0,b.size-32),'application/pdf');
      }
      const value=created(b);
      if (b instanceof Blob && b.type === 'application/pdf') { active.add(value); if(capturePdf) Object.assign(window,{latestSyntheticPdf:b}); }
      return value;
    };
    URL.revokeObjectURL = value => { active.delete(value); revoked(value); };
  },{token,user,uncertain,capturePdf,pdfFault});
  await page.context().route("**/api/**",async route => {
    const request=route.request(), url=new URL(request.url());
    if(request.method()!=="GET") { await route.abort("blockedbyclient"); throw new Error("Unexpected commercial write: "+request.method()+" "+url.pathname); }
    if(url.pathname.endsWith("/auth/me")) return route.fulfill({json:user});
    if(url.pathname.endsWith("/sales/81")) {
      expect(request.headers()['authorization'], 'GET ligado a la credencial sintetica').toBe('Bearer '+token);
      return route.fulfill({status:denial||200,json:denial?{message:"Synthetic denial"}:sale});
    }
    if(url.pathname.endsWith("/warehouses")) return route.fulfill({json:[{id:3,code:"SYN",name:"Almacén sintético",active:true,type:"MAIN_WAREHOUSE"}]});
    if(url.pathname.endsWith("/cash-registers/current")) return route.fulfill({json:{id:7,openedByUserId:user.id,openedAt:"2026-10-28T01:00:00Z",status:"OPEN",openingAmount:0}});
    if(url.pathname.includes("/sales/operations")) return route.fulfill({json:{items:[],page:0,size:10,totalItems:0,totalPages:0}});
    return route.fulfill({json:[]});
  });
  return { methods,errors,requests };
}
async function ready(page:Page) { await expect(page.getByRole("button",{name:"Descargar PDF",exact:true})).toBeEnabled({timeout:60000}); }
async function download(page:Page,name:string,folder=evidence) {
  const downloaded=page.waitForEvent("download");
  await page.getByRole("button",{name:"Descargar PDF",exact:true}).click();
  const file=await downloaded; await file.saveAs(path.join(folder,name+".pdf"));
  expect(await file.failure()).toBeNull(); expect(file.suggestedFilename()).toContain('V-SYN-0081');
  const bytes=await readFile(path.join(folder,name+".pdf"));
  expect(bytes.length,'PDF vacio o trivial').toBeGreaterThan(1024);
  expect(bytes.subarray(0,8).toString('ascii'),'Firma PDF').toMatch(/^%PDF-[12]\.\d/);
  expect(bytes.subarray(-2048).toString('latin1').trimEnd().endsWith('%%EOF'),'PDF truncado: falta EOF final').toBe(true);
}
async function openAccessible(page:Page) {
  const details=page.locator('.accessible-note');
  if (!await details.evaluate(element=>(element as HTMLDetailsElement).open)) await details.locator('summary').click();
  await expect(details.locator('article')).toBeVisible();
}
function latch() {
  let release!:()=>void; const promise=new Promise<void>(resolve=>release=resolve);
  return {promise,release:()=>release()};
}
async function navigateWithinNote(page:Page,id:string) {
  await page.evaluate(id=>{
    history.pushState(history.state,'','/ventas/'+id+'/nota');
    window.dispatchEvent(new PopStateEvent('popstate',{state:history.state}));
  },id);
  await expect(page).toHaveURL(new RegExp('/ventas/'+id+'/nota$'));
}
async function noDocument(page:Page) {
  await expect(page.locator('.note-workspace')).toHaveCount(0);
  await expect(page.locator('.note-page')).not.toContainText('V-SYN-0081');
  for (const name of ['Descargar PDF','Imprimir','Abrir PDF ↗']) await expect(page.getByRole('button',{name,exact:true})).toBeDisabled();
  expect(await page.evaluate(()=>(window as unknown as {noteUrls:Set<string>}).noteUrls.size)).toBe(0);
}

test("confirmed POS reference, immediate next sale focus and detail reprint use GET only",ciCase('pos'),async({page})=>{
  const {methods,errors,requests}=await setup(page); await page.goto("/pos");
  await expect(page.getByText("Venta V-SYN-0081 registrada.",{exact:true})).toBeVisible();
  expect(requests.some(r=>/pdfmake|vfs_fonts/.test(r))).toBe(false);
  await page.screenshot({path:path.join(evidence,"01-pos-desktop.png"),fullPage:true});
  await page.getByRole("button",{name:"Nueva venta",exact:true}).click(); await expect(page.locator(".scan-input")).toBeFocused();
  await page.getByRole("link",{name:"Ver nota interna",exact:true}).click(); await ready(page);
  await page.getByRole("link",{name:"Volver al POS",exact:true}).click();
  await page.goto("/ventas/81"); await page.getByRole("link",{name:"Ver nota interna",exact:true}).click(); await ready(page);
  expect(methods.every(m=>m.startsWith("GET "))).toBe(true); expect(errors).toEqual([]);
});

test("uncertain result never enables document actions or issues a POST",async({page})=>{
  const {methods}=await setup(page,noteSale(),0,true); await page.goto("/pos");
  await expect(page.getByText(/Operación conservada/)).toBeVisible();
  await expect(page.getByRole("link",{name:"Ver nota interna",exact:true})).toHaveCount(0);
  await expect(page.getByRole("button",{name:/Imprimir nota/})).toHaveCount(0);
  expect(methods.every(m=>m.startsWith("GET "))).toBe(true);
});

test("real PDF preview, A4/tickets, responsive screens, downloads and temporary print viewer",ciCase('pdf'),async({page})=>{
  const {methods,errors}=await setup(page,noteSale(),0,false,true); await page.goto("/ventas/81/nota"); await ready(page);
  await assertPresentationHtml(page);
  await expect(page.locator('.accessible-note')).toContainText('V-SYN-0081');
  await expect(page.locator('.accessible-note')).toContainText('150.00');
  for(const [name,width,height] of [["02-note-desktop",1440,1000],["03-note-tablet",900,1100],["04-note-mobile",390,844]] as const) {
    await page.setViewportSize({width,height}); await page.locator('.note-page').evaluate(e=>e.scrollIntoView({block:'start'})); await page.screenshot({path:path.join(evidence,name+".png"),fullPage:width>1100});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  for(const width of [320,768]) {
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const downloadButton=page.getByRole('button',{name:'Descargar PDF',exact:true}); await downloadButton.focus(); await expect(downloadButton).toBeFocused();
    const box=await downloadButton.boundingBox(); expect(box!.height).toBeGreaterThanOrEqual(44); expect(box!.width).toBeGreaterThan(44);
  }
  for (const format of ['a4','ticket80','ticket58'] as const) {
    if (format==='ticket80') await page.getByLabel("Formato",{exact:true}).selectOption("ticket");
    if (format==='ticket58') await page.getByLabel("Perfil de papel",{exact:true}).selectOption("ticket58");
    await ready(page);
    const generated=await page.evaluate(async()=>Array.from(new Uint8Array(await (window as unknown as {latestSyntheticPdf:Blob}).latestSyntheticPdf.arrayBuffer())));
    await download(page,format+'-normal');
    expect((await readFile(path.join(evidence,format+'-normal.pdf'))).equals(Buffer.from(generated)),'Descarga identica al Blob real del generador').toBe(true);
  }
  await page.getByRole("button",{name:"Imprimir",exact:true}).click();
  await expect(page.getByText(/Impresión solicitada al visor/)).toBeVisible({timeout:60000});
  const bytes=await page.evaluate(async()=>Array.from(new Uint8Array(await (window as unknown as {latestSyntheticPdf:Blob}).latestSyntheticPdf.arrayBuffer())));
  await writeFile(path.join(evidence,'print-request.pdf'),Buffer.from(bytes));
  await page.evaluate(()=>localStorage.setItem("erp_pos_token","different-synthetic-session"));
  await expect(page.getByText(/La sesión cambió/)).toBeVisible(); await expect(page.locator("iframe")).toHaveCount(0);
  expect(await page.evaluate(()=> (window as unknown as {noteUrls:Set<string>}).noteUrls.size)).toBe(0);
  expect(methods.every(m=>m.startsWith("GET "))).toBe(true); expect(errors).toEqual([]);
});

test("@native real integrated PDF viewer in desktop Chromium",async({page})=>{
  const {errors}=await setup(page); await page.setViewportSize({width:1440,height:1000});
  await page.goto('/ventas/81/nota'); await ready(page);
  expect(await page.evaluate(()=>navigator.pdfViewerEnabled)).toBe(true);
  await expect(page.locator('iframe')).toBeVisible();
  // The native viewer paints asynchronously after the PDF load event.
  await page.waitForTimeout(1500); await page.screenshot({path:path.join(evidence,'02b-native-pdf-viewer.png'),fullPage:true});
  expect(errors).toEqual([]);
});

test("50/200 items, pagination fixtures and repeated resource cleanup",async({page})=>{
  const sale=noteSale(50); const {methods,errors}=await setup(page,sale); const measurements:Record<string,number>={};
  let start=Date.now(); await page.goto("/ventas/81/nota"); await ready(page); measurements["50-items-cold-ms"]=Date.now()-start; await download(page,"a4-50");
  sale.items=noteSale(200).items; start=Date.now(); await page.getByLabel("Formato",{exact:true}).selectOption("ticket"); await ready(page); measurements["200-items-ticket-ms"]=Date.now()-start; await download(page,"ticket80-200");
  await page.getByLabel("Formato",{exact:true}).selectOption("a4"); await ready(page); await download(page,"a4-200");
  sale.status="VOIDED"; sale.voidedAt='2026-10-28T03:20:00Z'; await page.getByRole("button",{name:"Descargar PDF",exact:true}).click(); await ready(page); await expect(page.getByText(/La venta cambió/)).toBeVisible(); await download(page,"a4-annulled-200");
  const cdp=await page.context().newCDPSession(page); await cdp.send('HeapProfiler.enable'); const heap:number[]=[];
  for(let i=0;i<20;i++) { await page.getByLabel("Formato",{exact:true}).selectOption(i%2?"a4":"ticket"); await ready(page); expect(await page.evaluate(()=> (window as unknown as {noteUrls:Set<string>}).noteUrls.size)).toBe(1); await cdp.send('HeapProfiler.collectGarbage'); heap.push((await cdp.send('Runtime.getHeapUsage')).usedSize); }
  measurements['heap-first-bytes']=heap[0]; measurements['heap-last-bytes']=heap[19]; measurements['heap-last-five-range-bytes']=Math.max(...heap.slice(-5))-Math.min(...heap.slice(-5));
  await page.getByLabel("Formato",{exact:true}).selectOption("ticket"); await ready(page); await download(page,"ticket-annulled-200");
  await page.getByRole('link',{name:'Volver al detalle',exact:true}).click(); await expect(page.locator('.note-page')).toHaveCount(0);
  expect(await page.evaluate(()=> (window as unknown as {noteUrls:Set<string>}).noteUrls.size)).toBe(0);
  await writeFile(path.join(evidence,"performance.json"),JSON.stringify(measurements,null,2));
  expect(methods.every(m=>m.startsWith("GET "))).toBe(true); expect(errors).toEqual([]);
});

for(const code of [401,403,404,422]) test("denied sale "+code+" exposes no PDF or sale data",code===403?ciCase('denied'):{},async({page})=>{
  const {methods}=await setup(page,noteSale(),code); await page.goto("/ventas/81/nota");
  await expect(page.getByRole("alert")).toBeVisible(); await expect(page.locator("iframe")).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Descargar PDF",exact:true})).toBeDisabled();
  await expect(page.getByText("V-SYN-0081",{exact:true})).toHaveCount(0);
  if(code===403) await page.screenshot({path:path.join(evidence,"05-permission-error.png"),fullPage:true});
  expect(methods.every(m=>m.startsWith("GET "))).toBe(true);
});

test("loading, network failure and a successful retry reveal no stale document",ciCase('retry'),async({page})=>{
  const {methods}=await setup(page);
  const started=latch(),fail=latch();
  await page.route('**/api/v1/sales/81',async route=>{started.release();await fail.promise;await route.abort('internetdisconnected');});
  try {
    await page.goto('/ventas/81/nota');await started.promise;
    await expect(page.getByText('Cargando venta autorizada…',{exact:true})).toBeVisible();
    fail.release();await expect(page.getByRole('alert')).toContainText('Error de red');
  } finally {fail.release();}
  await expect(page.getByRole('button',{name:'Descargar PDF',exact:true})).toBeDisabled();
  await page.unroute('**/api/v1/sales/81'); await page.getByRole('button',{name:'Reintentar consulta',exact:true}).click(); await ready(page);
  await page.evaluate(()=>Object.assign(window,{noteRouteProbe:'same-document'}));
  await navigateWithinNote(page,'0');await expect(page.getByRole('alert')).toContainText('Identificador de venta no válido');await noDocument(page);
  expect(await page.evaluate(()=>(window as unknown as {noteRouteProbe:string}).noteRouteProbe)).toBe('same-document');
  const lateStarted=latch(),releaseLate=latch();
  await page.route('**/api/v1/sales/81',async route=>{lateStarted.release();await releaseLate.promise;await route.fulfill({json:noteSale()});});
  try {
    await navigateWithinNote(page,'81');await lateStarted.promise;
    await expect(page.getByText('Cargando venta autorizada…',{exact:true})).toBeVisible();
    await navigateWithinNote(page,'invalid');await noDocument(page);
    const response=page.waitForResponse(r=>r.url().endsWith('/api/v1/sales/81'));
    releaseLate.release();await (await response).finished();
    await expect(page.getByRole('alert')).toContainText('Identificador de venta no válido');await noDocument(page);
  } finally {releaseLate.release();}
  expect(methods.every(m=>m.startsWith('GET '))).toBe(true);
});

test("generation resource failure, blocked popup and regeneration after browser reload",ciCase('recover'),async({page})=>{
  const {methods}=await setup(page);
  await page.route('**/assets/images/brand/logo-inktoy.png',route=>route.abort());
  await page.goto('/ventas/81/nota'); await expect(page.getByRole('alert')).toContainText('No se pudo preparar');
  await page.unroute('**/assets/images/brand/logo-inktoy.png'); await page.getByRole('button',{name:'Reintentar consulta',exact:true}).click(); await ready(page);
  await page.evaluate(()=>{ window.open=()=>null; }); await page.getByRole('button',{name:'Imprimir',exact:true}).click();
  await expect(page.getByText(/Ventana bloqueada/)).toBeVisible();
  await page.reload(); await ready(page); await download(page,'a4-reopened');
  expect(methods.every(m=>m.startsWith('GET '))).toBe(true);
});

test("late HTTP result is discarded after a same-tab user change",ciCase('session'),async({page})=>{
  const {methods}=await setup(page); const sale=noteSale();
  const started=latch(),release=latch();
  await page.route('**/api/v1/sales/81',async route=>{started.release();await release.promise;await route.fulfill({json:sale});});
  try {
    await page.goto('/ventas/81/nota');await started.promise;await expect(page.getByText('Cargando venta autorizada…',{exact:true})).toBeVisible();
    await page.evaluate(()=>localStorage.setItem('erp_pos_token','synthetic-other-user'));
    await expect(page.getByText(/La sesión cambió/)).toBeVisible();
    const response=page.waitForResponse(r=>r.url().endsWith('/api/v1/sales/81'));
    release.release();await (await response).finished();await noDocument(page);
  } finally {release.release();}
  expect(methods.every(m=>m.startsWith('GET '))).toBe(true);
});

test("historical quantities and current catalog markup stay exact, labelled and inert",async({page})=>{
  const sale=noteSale(1); sale.items[0].productNameSnapshot=null; sale.items[0].skuSnapshot=null;
  sale.items[0].productName='<img src=x onerror="window.compromised=true"> Catálogo actual'.padEnd(180,'X'); sale.items[0].sku='S'.repeat(60);
  sale.items[0].quantityText='9999999999999.999'; sale.items[0].unitPrice=9999999999.99;
  const {methods,requests}=await setup(page,sale); await page.goto('/ventas/81/nota'); await ready(page);
  await openAccessible(page);
  await expect(page.getByText(/Histórico: nombre del catálogo actual/)).toBeVisible();
  await expect(page.getByText('9999999999999.999',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=> (window as unknown as {compromised?:boolean}).compromised)).toBeUndefined();
  expect(requests.some(url=>new URL(url).pathname==='/x')).toBe(false);
  await download(page,'a4-historical-long-values'); await page.getByLabel('Formato',{exact:true}).selectOption('ticket'); await ready(page);
  await page.getByLabel('Perfil de papel',{exact:true}).selectOption('ticket58'); await ready(page); await download(page,'ticket58-historical-long-values');
  expect(methods.every(m=>m.startsWith('GET '))).toBe(true);
});

test('@preview-layout approved PDF remains primary with a full-width viewer and a collapsible accessible alternative',async({page})=>{
  const folder=path.join(evidence,'preview-print-recovery');await mkdir(folder,{recursive:true});
  const {methods,errors}=await setup(page,noteSale(2),0,false,true);
  await page.setViewportSize({width:1440,height:1000});await page.goto('/ventas/81/nota');await ready(page);
  for(const format of ['a4','ticket80','ticket58'] as const) {
    if(format==='ticket80')await page.getByLabel('Formato',{exact:true}).selectOption('ticket');
    if(format==='ticket58')await page.getByLabel('Perfil de papel',{exact:true}).selectOption('ticket58');
    await ready(page);
    const workspace=await page.locator('.note-workspace').boundingBox(),preview=await page.locator('.preview-panel').boundingBox();
    expect(preview!.width).toBeGreaterThan(workspace!.width*.95);
    if (await page.evaluate(()=>navigator.pdfViewerEnabled)) {
      await expect(page.locator('.accessible-note')).not.toHaveAttribute('open');
      await expect(page.locator('iframe')).toHaveAttribute('src',/#toolbar=1&navpanes=0&view=Fit$/);
    } else {
      await expect(page.locator('iframe')).toHaveCount(0);
      await expect(page.locator('.accessible-note article')).toBeVisible();
      await expect(page.locator('.preview-placeholder')).toBeVisible();
    }
    await expect(page.getByRole('button',{name:'Imprimir',exact:true})).toBeEnabled();
    await page.screenshot({path:path.join(folder,'preview-'+format+'.png'),fullPage:true});
  }
  await openAccessible(page);
  expect(methods.every(method=>method.startsWith('GET '))).toBe(true);expect(errors).toEqual([]);
});

const presentationEvidence=path.join(evidence,'presentation-final');
async function recordPresentation(name:string,sale:ReturnType<typeof noteSale>,folder=presentationEvidence):Promise<void> {
  const money=(value:number)=>new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(value);
  await writeFile(path.join(folder,name+'.expected.json'),JSON.stringify({
    number:sale.saleNumber,status:sale.status,date:'27 oct. 2026',
    items:sale.items.map(item=>({name:item.productNameSnapshot ?? item.productName,quantity:item.quantityText,
      price:money(item.unitPrice),discount:money(item.discountAmount),total:money(item.lineTotal)})),
    totals:[sale.subtotalAmount,sale.discountAmount,sale.totalAmount,sale.paidAmount,sale.changeAmount].map(money),
    payments:sale.payments.map(payment=>money(payment.amount)),
    banned:[...sale.items.map(item=>item.skuSnapshot || item.sku),sale.createdBy,'NEVER_EXPORT'],
  },null,2));
}
async function assertPresentationHtml(page:Page):Promise<void> {
  await openAccessible(page);
  await expect(page.getByRole('heading',{name:'NOTA DE VENTA',exact:true})).toBeVisible();
  const html=page.locator('.accessible-note'); await expect(html).toContainText('NOTA DE VENTA');
  for(const text of ['SKU','INK-SYN-','CURRENT','Cajero','Caja #','Almacén','No es comprobante','Documento interno','NEVER_EXPORT']) await expect(html).not.toContainText(text);
}
test('@presentation clean normal, long-name and exceptional tickets preserve values, reads and output identity',async({page})=>{
  await mkdir(presentationEvidence,{recursive:true}); const sale=noteSale(2);
  sale.items[0].productNameSnapshot='Cuaderno A5 rayado';sale.items[0].quantityText='2.000';sale.items[0].unitPrice=6;sale.items[0].lineTotal=12;sale.items[0].discountAmount=0;
  sale.items[1].productNameSnapshot='Lápices de color';
  const {methods,errors}=await setup(page,sale,0,false,true); await page.setViewportSize({width:1440,height:1000});
  await page.goto('/ventas/81/nota');await ready(page);await assertPresentationHtml(page);
  const preview=await page.evaluate(async()=>Array.from(new Uint8Array(await (window as unknown as {latestSyntheticPdf:Blob}).latestSyntheticPdf.arrayBuffer())));
  await download(page,'a4-normal',presentationEvidence);await recordPresentation('a4-normal',sale);
  expect(await readFile(path.join(presentationEvidence,'a4-normal.pdf'))).toEqual(Buffer.from(preview));
  await page.locator('.accessible-note').scrollIntoViewIfNeeded();await page.locator('.accessible-note').screenshot({path:path.join(presentationEvidence,'html-updated.png')});
  for(const profile of ['ticket80','ticket58']) {
    if(profile==='ticket80')await page.getByLabel('Formato',{exact:true}).selectOption('ticket');
    else await page.getByLabel('Perfil de papel',{exact:true}).selectOption('ticket58');
    await ready(page);await assertPresentationHtml(page);await download(page,profile+'-normal',presentationEvidence);await recordPresentation(profile+'-normal',sale);
  }
  sale.items=noteSale(3).items; sale.items.forEach((item,index)=>item.productNameSnapshot=(`Producto largo ${index+1} · Cuaderno para ilustración, lápices de diseño y papelería escolar con tildes y ñ. `).padEnd(180,'Z'));
  for(const profile of ['ticket80','ticket58']) {
    if(profile==='ticket80') await page.getByLabel('Perfil de papel',{exact:true}).selectOption('ticket80');
    else await page.getByLabel('Perfil de papel',{exact:true}).selectOption('ticket58');
    await ready(page);await download(page,profile+'-long-names',presentationEvidence);await recordPresentation(profile+'-long-names',sale);
  }
  sale.items[0].quantityText='9999999999999.999';sale.items[0].unitPrice=9999999999.99;sale.items[0].lineTotal=9999999999.98;
  for(const profile of ['ticket80','ticket58']) {
    await page.getByLabel('Perfil de papel',{exact:true}).selectOption(profile);await ready(page);
    await download(page,profile+'-long-values',presentationEvidence);await recordPresentation(profile+'-long-values',sale);
  }
  await page.getByRole('button',{name:'Imprimir',exact:true}).click(); await expect(page.getByText(/Impresión solicitada al visor/)).toBeVisible();
  const printBytes=await page.evaluate(async()=>Array.from(new Uint8Array(await (window as unknown as {latestSyntheticPdf:Blob}).latestSyntheticPdf.arrayBuffer())));
  await writeFile(path.join(presentationEvidence,'print-presentation.pdf'),Buffer.from(printBytes));await recordPresentation('print-presentation',sale);
  await page.evaluate(()=>localStorage.setItem('erp_pos_token','another-synthetic-session'));
  await expect(page.getByText(/La sesión cambió/)).toBeVisible();await expect(page.locator('.accessible-note')).toHaveCount(0);
  await expect(page.locator('.note-page')).not.toContainText('V-SYN-0081');
  expect(await page.evaluate(()=> (window as unknown as {noteUrls:Set<string>}).noteUrls.size)).toBe(0);
  expect(methods.every(method=>method.startsWith('GET '))).toBe(true);expect(errors).toEqual([]);
});

test('@presentation extensive A4/tickets, annulment and reprint use the updated template without writes',async({page})=>{
  await mkdir(presentationEvidence,{recursive:true});const sale=noteSale(200);const {methods,errors}=await setup(page,sale);
  await page.goto('/ventas/81');await page.getByRole('link',{name:'Ver nota interna',exact:true}).click();await ready(page);await assertPresentationHtml(page);
  await download(page,'a4-multi',presentationEvidence);await recordPresentation('a4-multi',sale);
  await page.getByLabel('Formato',{exact:true}).selectOption('ticket');await ready(page);
  await download(page,'ticket80-multi',presentationEvidence);await recordPresentation('ticket80-multi',sale);
  sale.status='VOIDED';sale.voidedAt='2026-10-28T03:20:00Z';
  await page.getByRole('button',{name:'Descargar PDF',exact:true}).click();await ready(page);await expect(page.getByText(/La venta cambió/)).toBeVisible();
  await download(page,'ticket80-annulled',presentationEvidence);await recordPresentation('ticket80-annulled',sale);
  await page.getByLabel('Perfil de papel',{exact:true}).selectOption('ticket58');await ready(page);
  await download(page,'ticket58-annulled',presentationEvidence);await recordPresentation('ticket58-annulled',sale);
  await page.getByLabel('Formato',{exact:true}).selectOption('a4');await ready(page);
  await download(page,'a4-annulled',presentationEvidence);await recordPresentation('a4-annulled',sale);
  await assertPresentationHtml(page);expect(methods.every(method=>method.startsWith('GET '))).toBe(true);expect(errors).toEqual([]);
});

test('@ticket-columns reference layout on both widths, long values, continuations and annulment uses reads only',async({page})=>{
  test.setTimeout(60000);
  const folder=path.join(evidence,process.env['INKTOY_TICKET_EVIDENCE_SUBDIR'] ?? 'ticket-columns');await mkdir(folder,{recursive:true});
  const sale=noteSale(2);sale.items[0].productNameSnapshot='Cuaderno A5 rayado';sale.items[0].quantityText='2.000';
  sale.items[0].unitPrice=6;sale.items[0].lineTotal=12;sale.items[0].discountAmount=0;
  sale.items[1].productNameSnapshot='Lápices de color';
  const {methods,errors}=await setup(page,sale,0,false,true);
  await page.goto('/ventas/81');await page.getByRole('link',{name:'Ver nota interna',exact:true}).click();await ready(page);
  await page.getByLabel('Formato',{exact:true}).selectOption('ticket');await ready(page);
  for(const profile of ['ticket80','ticket58']) {
    if(profile==='ticket58')await page.getByLabel('Perfil de papel',{exact:true}).selectOption(profile);
    await ready(page);await assertPresentationHtml(page);
    const preview=await page.evaluate(async()=>Array.from(new Uint8Array(await (window as unknown as {latestSyntheticPdf:Blob}).latestSyntheticPdf.arrayBuffer())));
    await download(page,profile+'-normal',folder);await recordPresentation(profile+'-normal',sale,folder);
    expect(await readFile(path.join(folder,profile+'-normal.pdf'))).toEqual(Buffer.from(preview));
  }
  sale.items=noteSale(3).items;sale.items.forEach((item,index)=>item.productNameSnapshot=
    (`Producto largo ${index+1} · Cuaderno para ilustración, lápices de diseño y papelería escolar con tildes y ñ. `).padEnd(180,'Z'));
  sale.items[0].quantityText='9999999999999.999';sale.items[0].unitPrice=9999999999.99;sale.items[0].lineTotal=9999999999.98;
  for(const profile of ['ticket80','ticket58']) {
    await page.getByLabel('Perfil de papel',{exact:true}).selectOption(profile);await ready(page);
    await download(page,profile+'-long-values',folder);await recordPresentation(profile+'-long-values',sale,folder);
  }
  sale.items=noteSale(41).items;await page.getByLabel('Perfil de papel',{exact:true}).selectOption('ticket80');await ready(page);
  await download(page,'ticket80-multi',folder);await recordPresentation('ticket80-multi',sale,folder);
  sale.status='VOIDED';sale.voidedAt='2026-10-28T03:20:00Z';
  await page.getByRole('button',{name:'Descargar PDF',exact:true}).click();await ready(page);
  await expect(page.getByText(/La venta cambió/)).toBeVisible();
  for(const profile of ['ticket80','ticket58']) {
    if(profile==='ticket58')await page.getByLabel('Perfil de papel',{exact:true}).selectOption(profile);
    await ready(page);await download(page,profile+'-annulled',folder);await recordPresentation(profile+'-annulled',sale,folder);
  }
  await page.evaluate(()=>localStorage.setItem('erp_pos_token','another-synthetic-session'));
  await expect(page.getByText(/La sesión cambió/)).toBeVisible();await expect(page.locator('.accessible-note')).toHaveCount(0);
  expect(await page.evaluate(()=> (window as unknown as {noteUrls:Set<string>}).noteUrls.size)).toBe(0);
  expect(methods.every(method=>method.startsWith('GET '))).toBe(true);expect(errors).toEqual([]);
});

test('@regular-black all formats and annulment keep regular black text and unchanged values',async({page})=>{
  test.setTimeout(60000);
  const folder=path.join(evidence,process.env['INKTOY_NOTE_EVIDENCE_SUBDIR'] ?? 'regular-black');await mkdir(folder,{recursive:true});
  const sale=noteSale(2);sale.items[0].productNameSnapshot='Cuaderno A5 rayado';sale.items[0].quantityText='2.000';
  sale.items[0].unitPrice=6;sale.items[0].lineTotal=12;sale.items[0].discountAmount=0;sale.items[1].productNameSnapshot='Lápices de color';
  const {methods,errors}=await setup(page,sale,0,false,true);await page.goto('/ventas/81/nota');await ready(page);
  const assertHtml=async():Promise<void>=>{
    await assertPresentationHtml(page);
    await expect(page.locator('.accessible-note tbody td:first-child strong')).toHaveText(sale.items.map(item=>item.productNameSnapshot ?? item.productName ?? 'Descripción no disponible'));
    for(const theme of ['light','dark']) {
      await page.locator('body').evaluate((element,theme)=>element.setAttribute('data-theme',theme),theme);
      const styles=await page.locator('.accessible-note').evaluate(element=>[element,...element.querySelectorAll('*')]
        .filter(node=>[...node.childNodes].some(child=>child.nodeType===Node.TEXT_NODE && !!child.textContent?.trim()))
        .map(node=>({weight:getComputedStyle(node).fontWeight,color:getComputedStyle(node).color})));
      expect(styles.length).toBeGreaterThan(10);
      for(const style of styles)expect(style).toEqual({weight:'400',color:'rgb(0, 0, 0)'});
      await expect(page.locator('.accessible-note')).toHaveCSS('background-color','rgb(255, 255, 255)');
    }
  };
  await assertHtml();await page.locator('.accessible-note').screenshot({path:path.join(folder,'html-regular-black.png')});
  const capture=async(format:string,state:string):Promise<void>=>{
    if(format==='a4')await page.getByLabel('Formato',{exact:true}).selectOption('a4');
    else if(format==='ticket80')await page.getByLabel('Formato',{exact:true}).selectOption('ticket');
    else await page.getByLabel('Perfil de papel',{exact:true}).selectOption('ticket58');
    await ready(page);
    const preview=await page.evaluate(async()=>Array.from(new Uint8Array(await (window as unknown as {latestSyntheticPdf:Blob}).latestSyntheticPdf.arrayBuffer())));
    await download(page,format+'-'+state,folder);await recordPresentation(format+'-'+state,sale,folder);
    expect(await readFile(path.join(folder,format+'-'+state+'.pdf'))).toEqual(Buffer.from(preview));
  };
  for(const format of ['a4','ticket80','ticket58'])await capture(format,'normal');
  sale.items=noteSale(41).items;sale.status='VOIDED';sale.voidedAt='2026-10-28T03:20:00Z';
  for(const format of ['a4','ticket80','ticket58'])await capture(format,'annulled');
  await assertHtml();await page.getByRole('button',{name:'Imprimir',exact:true}).click();
  await expect(page.getByText(/Impresión solicitada al visor/)).toBeVisible();
  const printBytes=await page.evaluate(async()=>Array.from(new Uint8Array(await (window as unknown as {latestSyntheticPdf:Blob}).latestSyntheticPdf.arrayBuffer())));
  await writeFile(path.join(folder,'print-regular.pdf'),Buffer.from(printBytes));await recordPresentation('print-regular',sale,folder);
  await page.evaluate(()=>localStorage.setItem('erp_pos_token','another-synthetic-session'));
  await expect(page.getByText(/La sesión cambió/)).toBeVisible();await expect(page.locator('.accessible-note')).toHaveCount(0);
  expect(await page.evaluate(()=> (window as unknown as {noteUrls:Set<string>}).noteUrls.size)).toBe(0);
  expect(methods.every(method=>method.startsWith('GET '))).toBe(true);expect(errors).toEqual([]);
});

test('@a4-reference framed A4 layout uses available sale data through reprint, pagination, history and print',async({page})=>{
  test.setTimeout(60000);
  const folder=path.join(evidence,process.env['INKTOY_A4_EVIDENCE_SUBDIR'] ?? 'a4-reference');await mkdir(folder,{recursive:true});
  const sale=noteSale(2);sale.items[0].productNameSnapshot='Cuaderno A5 rayado';sale.items[0].quantityText='2.000';
  sale.items[0].unitPrice=6;sale.items[0].lineTotal=12;sale.items[0].discountAmount=0;sale.items[1].productNameSnapshot='Lápices de color';
  const {methods,errors}=await setup(page,sale,0,false,true);
  await page.goto('/ventas/81');await page.getByRole('link',{name:'Ver nota interna',exact:true}).click();await ready(page);
  const capture=async(name:string):Promise<void>=>{
    await ready(page);await assertPresentationHtml(page);
    const preview=await page.evaluate(async()=>Array.from(new Uint8Array(await (window as unknown as {latestSyntheticPdf:Blob}).latestSyntheticPdf.arrayBuffer())));
    await download(page,name,folder);await recordPresentation(name,sale,folder);
    expect(await readFile(path.join(folder,name+'.pdf'))).toEqual(Buffer.from(preview));
  };
  await capture('a4-normal');
  sale.items=noteSale(50).items;await page.reload();await capture('a4-multi-50');
  sale.items=noteSale(200).items;sale.status='VOIDED';sale.voidedAt='2026-10-28T03:20:00Z';
  await page.reload();await capture('a4-annulled-200');
  sale.items=noteSale(1).items;sale.status='COMPLETED';sale.voidedAt=null;
  Object.assign(sale.items[0],{productNameSnapshot:null,skuSnapshot:null,
    productName:'Producto histórico · Cuaderno para ilustración y papelería con tildes y ñ. '.padEnd(180,'Z'),
    quantityText:'9999999999999.999',unitPrice:9999999999.99,lineTotal:9999999999.98,discountAmount:.01});
  Object.assign(sale,{subtotalAmount:9999999999.99,discountAmount:.01,totalAmount:9999999999.98,paidAmount:9999999999.99,changeAmount:.01});
  sale.payments[0].amount=9999999999.98;sale.payments[1].amount=.01;
  await page.reload();await capture('a4-historical-extreme');
  await openAccessible(page);
  await expect(page.getByText(/Histórico: nombre del catálogo actual/)).toBeVisible();
  await page.getByRole('button',{name:'Imprimir',exact:true}).click();
  await expect(page.getByText(/Impresión solicitada al visor/)).toBeVisible();
  const printBytes=await page.evaluate(async()=>Array.from(new Uint8Array(await (window as unknown as {latestSyntheticPdf:Blob}).latestSyntheticPdf.arrayBuffer())));
  await writeFile(path.join(folder,'print-a4-reference.pdf'),Buffer.from(printBytes));await recordPresentation('print-a4-reference',sale,folder);
  await page.evaluate(()=>localStorage.setItem('erp_pos_token','another-synthetic-session'));
  await expect(page.getByText(/La sesión cambió/)).toBeVisible();await expect(page.locator('.accessible-note')).toHaveCount(0);
  expect(await page.evaluate(()=> (window as unknown as {noteUrls:Set<string>}).noteUrls.size)).toBe(0);
  expect(methods.every(method=>method.startsWith('GET '))).toBe(true);expect(errors).toEqual([]);
});
