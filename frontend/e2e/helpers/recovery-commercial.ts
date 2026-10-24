import { test as base, expect, Page, Locator, BrowserContext } from "@playwright/test";
import { requireIsolatedQa } from "../guards/environment.guard";

export const DIAG="/api/v1/health/recovery-e2e";
export interface CaseFixture {username:string;actor_id:string;cash_id:number;product_id:number;product_name:string;warehouse_id:number;quote_id:number|null;}
export interface QaIdentity {runId:string;database:string;dbUser:string;systemId:string;markerMatched:boolean;filter:string;ready:boolean;pid:number;proxyRunId:string;
  cases:CaseFixture[];series:Array<{id:number;document_type:string;series:string;current_number:number}>;}
export type Snapshot={runId:string;cash_id:number;cash_status:string;expected_cash_amount:number|null;sales:number;payments:number;paid:number;cash_change:number;
  movements:number;movement_quantity:number;stock:number;documents:number;quote_sale_id:number|null;operation?:Record<string,any>|null};
export async function guardContext(context:BrowserContext,violations:string[],pageErrors:string[]){
  const runId=requireIsolatedQa();
  await context.route("**/*",async route=>{
    const url=new URL(route.request().url()),method=route.request().method();
    if(url.origin!=="http://127.0.0.1:4201"){violations.push("EXTERNAL_REQUEST");return route.abort();}
    if(url.pathname.startsWith("/api/")&&!["GET","POST"].includes(method)){violations.push("UNAPPROVED_METHOD");return route.abort();}
    if(method==="POST"&&!(["/api/v1/auth/login","/api/v1/sales","/api/v1/sales/operations"].includes(url.pathname)
      ||/^\/api\/v1\/sales\/operations\/[0-9a-f-]{36}\/cancel$/i.test(url.pathname)
      ||/^\/api\/v1\/billing\/documents\/from-sale\/\d+$/.test(url.pathname)
      ||/^\/api\/v1\/quotes\/\d+\/convert-to-sale$/.test(url.pathname)
      ||/^\/api\/v1\/cash-registers\/\d+\/close$/.test(url.pathname))){violations.push("UNAPPROVED_POST");return route.abort();}
    return route.continue();
  });
  context.on("response",r=>{if(new URL(r.url()).pathname.startsWith("/api/")&&(r.headers()["x-qa-run-id"]!==runId||r.headers()["x-qa-recovery"]!=="enforced"))violations.push("FOREIGN_BACKEND");});
  context.on("page",p=>p.on("pageerror",()=>pageErrors.push("BROWSER_PAGE_ERROR")));
  for(const p of context.pages())p.on("pageerror",()=>pageErrors.push("BROWSER_PAGE_ERROR"));
}
export const test=base.extend<{qa:QaIdentity;posts:Array<{path:string;operationId:string|null}>}>({
  qa:async({page,context},use,testInfo)=>{
    const runId=requireIsolatedQa(),violations:string[]=[],pageErrors:string[]=[];
    await guardContext(context,violations,pageErrors);
    await page.goto("/login");
    const response=await browserApi(page,"GET",DIAG);expect(response.status).toBe(200);const qa=response.body as QaIdentity;
    expect(qa.runId).toBe(runId);expect(qa.database).toBe(process.env.QA_DB_NAME);expect(qa.dbUser).toBe(qa.database);
    expect(qa.systemId).toBe(process.env.QA_SYSTEM_ID);expect(qa.markerMatched).toBe(true);expect(qa.ready).toBe(true);
    expect(qa.filter).toBe("recovery-enforced");expect(qa.proxyRunId).toBe(runId);expect(qa.pid).toBe(1);expect(qa.cases).toHaveLength(10);
    await use(qa);
    if(testInfo.status!==testInfo.expectedStatus&&!page.isClosed()&&!page.url().includes("/login"))await page.screenshot({path:`/qa-run/screenshots/failure-${testInfo.testId.replace(/[^a-z0-9]/gi,"_")}.png`}).catch(()=>{});
    expect(violations).toEqual([]);expect(pageErrors).toEqual([]);
  },
  posts:async({page},use)=>{const values:Array<{path:string;operationId:string|null}>=[];page.on("request",request=>{
    const path=new URL(request.url()).pathname;if(request.method()!=="POST"||path==="/api/v1/auth/login")return;
    let id=null;try{id=request.postDataJSON()?.operationId??null;}catch{}
    values.push({path,operationId:id});});await use(values);},
});
export {expect};
export function fixture(qa:QaIdentity,n:number):CaseFixture {const row=qa.cases.find(r=>r.username===`${process.env.E2E_QA_USER}_${n}`);if(!row)throw Error("QA_CASE_MISSING");return row;}
export async function browserApi(page:Page,method:string,path:string,body?:unknown):Promise<{status:number;body:any;noStore:string|null}>{
  return page.evaluate(async({method,path,body})=>{
    if(!path.startsWith("/api/"))throw Error("QA_RELATIVE_API_REQUIRED");
    const token=localStorage.getItem("erp_pos_token");
    const response=await fetch(path,{method,headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
    return {status:response.status,body:await response.json(),noStore:response.headers.get("cache-control")};
  },{method,path,body});
}
export async function login(page:Page,username:string){
  await page.goto("/login");await page.getByLabel("Usuario o Email").fill(username);await page.getByLabel("Password").fill(process.env.E2E_QA_PASSWORD!);
  const response=page.waitForResponse(r=>new URL(r.url()).pathname==="/api/v1/auth/login");await page.getByRole("button",{name:"Ingresar",exact:true}).click();
  expect((await response).status()).toBe(200);await expect(page).toHaveURL(/\/dashboard$/);
}
export async function logout(page:Page){await page.getByRole("button",{name:/Abrir menú de usuario/}).click();await page.getByRole("menuitem",{name:"Cerrar sesion",exact:true}).click();await expect(page).toHaveURL(/\/login$/);}
export async function snapshot(page:Page,n:number,id?:string):Promise<Snapshot>{
  const response=await browserApi(page,"GET",DIAG+`/snapshot?case=${n}`+(id?`&operationId=${encodeURIComponent(id)}`:""));expect(response.status).toBe(200);
  expect(response.body.runId).toBe(process.env.QA_RUN_ID);return response.body;
}
export function prepareBody(f:CaseFixture,id=crypto.randomUUID()){
  return {protocolVersion:1,origin:"POS",operationId:id,command:{warehouseId:f.warehouse_id,operationId:id,confirmedTotal:10,
    items:[{productId:f.product_id,quantity:1,discountAmount:0,confirmedUnitPrice:10}],payments:[{paymentMethod:"CASH",amount:10,reference:null}]},
    quoteId:null,quoteCommand:null,receiptIntent:{receiptType:"TICKET",payload:null}};
}
export async function posCart(page:Page,f:CaseFixture,quantity=1){
  await page.goto("/pos");await expect(page.getByRole("heading",{name:"Punto de venta",exact:true})).toBeVisible();
  const warehouse=page.getByRole("combobox",{name:/^Almacén de salida/});
  await expect(warehouse.locator("option")).toHaveCount(2);
  await expect(warehouse).toHaveValue(new RegExp(`: ${f.warehouse_id}$`));
  await expect(page.getByText("Caja abierta",{exact:true})).toBeVisible();
  const search=page.getByLabel("Buscar o escanear producto");await search.fill(f.product_name);
  const response=page.waitForResponse(r=>new URL(r.url()).pathname==="/api/v1/pos/products/search");
  await page.getByRole("button",{name:"Buscar",exact:true}).click();expect((await response).status()).toBe(200);
  const product=page.getByRole("article").filter({has:page.getByRole("heading",{name:f.product_name,exact:true})});
  await expect(product).toBeVisible();await product.getByRole("button",{name:"Agregar",exact:true}).click();
  await expect(page.getByLabel("Cantidad del producto")).toHaveValue("1");
  if(quantity!==1)await page.getByLabel("Cantidad del producto").fill(String(quantity));
  await page.getByRole("button",{name:"COBRAR",exact:true}).click();const modal=page.getByRole("dialog",{name:"Cobrar venta",exact:true});
  await expect(modal).toBeVisible();await expect(modal.getByRole("button",{name:"Cerrar",exact:true})).toBeFocused();
  await modal.getByLabel("Monto *",{exact:true}).fill(String(quantity*10));return modal;
}
export async function confirmSale(page:Page,modal:Locator,double=false){
  await modal.getByRole("button",{name:/^COBRAR(?: Y EMITIR)?$/}).click();const confirm=page.getByRole("alertdialog",{name:"Confirmar venta",exact:true});
  await expect(confirm).toBeVisible();
  const extended=confirm.getByRole("region",{name:"Detalles de la confirmación",exact:true});
  if(await extended.count())await expect(confirm.getByRole("heading",{name:"Confirmar venta",exact:true})).toBeFocused();
  else await expect(confirm.getByRole("button",{name:"Cancelar",exact:true})).toBeFocused();
  if(double)await confirm.getByRole("button",{name:"Cobrar",exact:true}).dblclick();else await confirm.getByRole("button",{name:"Cobrar",exact:true}).click();
}
export async function closeCheckoutIfOpen(page:Page){const modal=page.getByRole("dialog",{name:"Cobrar venta",exact:true});if(await modal.isVisible())await modal.getByRole("button",{name:"Cerrar",exact:true}).click();}
export async function openRecovery(page:Page){
  const toggle=page.getByRole("button",{name:/^(Recuperar operaciones|Ocultar operaciones)$/});
  await expect(toggle).toBeVisible();if(await toggle.getAttribute("aria-expanded")==="false")await toggle.click();
  const panel=page.getByRole("region",{name:"Mis operaciones comerciales"});await expect(panel).toBeVisible();return panel;
}
export async function selectOperation(page:Page,id:string){const panel=await openRecovery(page);await panel.getByRole("button",{name:new RegExp(id.slice(0,8))}).click();await expect(panel.getByText(`Operación ${id}`,{exact:true})).toBeVisible();return panel;}
export async function screenshot(page:Page,name:string,fullPage=true){if(page.url().includes("/login"))throw Error("QA_LOGIN_SCREENSHOT_FORBIDDEN");await page.screenshot({path:`/qa-run/screenshots/${name}.png`,fullPage});}
export async function usable(locator:Locator){await expect(locator).toBeVisible();await expect(locator).toBeEnabled();await locator.scrollIntoViewIfNeeded();
  expect(await locator.evaluate(element=>{const r=element.getBoundingClientRect();const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return r.width>0&&r.height>0&&!!hit&&(hit===element||element.contains(hit));})).toBe(true);}
