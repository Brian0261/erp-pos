import { test, expect, Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { noteSale } from "../../src/app/features/sales/internal-note/note-test-data";

const evidence = path.join(os.tmpdir(), "inktoy-ux-ventas-1", "visual");
const token = "synthetic-sales-consultation";
const fixture = () => {
  const sale = noteSale(2);
  Object.assign(sale,{subtotalAmount:22,discountAmount:1,totalAmount:21,paidAmount:30,changeAmount:9,createdBy:"synthetic.cashier",voidReason:"Validación sintética"});
  Object.assign(sale.items[0],{productNameSnapshot:"Cuaderno A4 rayado",skuSnapshot:"SYN-CUA",quantityText:"2",quantity:2,unitPrice:6,discountAmount:0,lineTotal:12});
  Object.assign(sale.items[1],{productNameSnapshot:"Lápices de color",skuSnapshot:"SYN-LAP",quantityText:"1.25",quantity:1.25,unitPrice:8,discountAmount:1,lineTotal:9});
  sale.payments=[{id:1,paymentMethod:"CASH",amount:30,reference:null,createdAt:sale.soldAt}];
  return sale;
};
const fiscalDocument = (status="DRAFT",environment="BETA") => ({id:901,saleId:81,billingSeriesId:21,documentType:"RECEIPT",fullNumber:"B-SYN-0009",series:"B-SYN",number:9,status,environment,
  customerName:"Cliente sintético",customerDocument:null,subtotalAmount:22,taxAmount:0,totalAmount:21,xmlGeneratedAt:null,signedAt:null,sentAt:null,
  providerTicket:null,providerMessage:null,createdAt:"2026-10-28T02:20:00Z",updatedAt:"2026-10-28T02:20:00Z",items:[]});
async function setup(page:Page, roles=["ADMIN"]) {
  const sale=fixture(), writes:string[]=[], errors:string[]=[], unexpected:string[]=[];
  let documentMode: unknown = [], documentStatus=200, reads=0;
  page.on("pageerror",e=>errors.push(e.message));
  page.context().on("request",request=>{ if(new URL(request.url()).pathname.includes("/api/")&&request.method()!=="GET") writes.push(request.method()+" "+request.url()); });
  await page.addInitScript(token=>{localStorage.setItem("erp_pos_token",token);localStorage.setItem("erp_pos_theme","dark");},token);
  await page.context().route("**/api/**",async route=>{
    const request=route.request(), url=new URL(request.url());
    if(request.method()!=="GET"){await route.abort("blockedbyclient");return;}
    expect(request.headers()["authorization"]).toBe("Bearer "+token);
    if(url.pathname.endsWith("/auth/me"))return route.fulfill({json:{id:"synthetic-owner",username:"synthetic.cashier",email:"qa@example.invalid",roles}});
    if(url.pathname.endsWith("/sales/list-items"))return route.fulfill({json:[{id:sale.id,saleNumber:sale.saleNumber,soldAt:sale.soldAt,status:sale.status,
      totalAmount:sale.totalAmount,createdBy:sale.createdBy,cashRegisterSessionId:sale.cashRegisterSessionId,
      billingSummary:{hasElectronicDocument:false,documentId:null,documentType:null,fullNumber:null,status:null,environment:null}}]});
    if(url.pathname.endsWith("/sales/81"))return route.fulfill({json:sale});
    if(url.pathname.endsWith("/billing/documents")){reads++;return route.fulfill({status:documentStatus,json:documentMode});}
    if(url.pathname.endsWith("/billing/documents/901"))return route.fulfill({json:fiscalDocument()});
    if(url.pathname.endsWith("/billing/documents/901/history"))return route.fulfill({json:[]});
    if(roles.includes("ALMACENERO") && ["/api/v1/reports/low-stock","/api/v1/reports/inventory-movements"].includes(url.pathname))return route.fulfill({json:[]});
    if(roles.includes("ALMACENERO") && ["/api/v1/inventory/stocks","/api/v1/products"].includes(url.pathname))return route.fulfill({json:{items:[],content:[],totalItems:0,totalElements:0,totalPages:0,page:0,size:1}});
    unexpected.push(request.method()+" "+url.pathname);return route.abort("blockedbyclient");
  });
  return {sale,writes,errors,unexpected,reads:()=>reads, documents:(body:unknown,status=200)=>{documentMode=body;documentStatus=status;}};
}
async function verifyNoWrites(state:Awaited<ReturnType<typeof setup>>) { expect(state.writes).toEqual([]);expect(state.errors).toEqual([]);expect(state.unexpected).toEqual([]); }
for(const viewport of [{width:1440,height:1000},{width:1024,height:768},{width:390,height:844}]) {
  test("sales/detail/context responsive no-write "+viewport.width,async({page})=>{
    await mkdir(evidence,{recursive:true});await page.setViewportSize(viewport);const state=await setup(page);
    await page.goto("/ventas");await expect(page.locator('.sales-page').getByRole("heading",{name:"Ventas",exact:true})).toBeVisible();
    await expect(page.getByText("Sin documento electrónico registrado",{exact:true})).toBeVisible();
    await page.getByLabel("Estado comercial",{exact:true}).selectOption("COMPLETED");
    await page.getByRole("button",{name:"Filtrar",exact:true}).click();await expect(page).toHaveURL(/salesStatus=COMPLETED/);
    await page.screenshot({path:path.join(evidence,"list-"+viewport.width+".png"),fullPage:true});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
    const detail=page.getByRole("link",{name:"Ver detalle de venta #81",exact:true});await detail.scrollIntoViewIfNeeded();await detail.click();
    await expect(page.getByRole("heading",{name:"Venta #81",exact:true})).toBeVisible();
    await expect(page.getByRole("link",{name:"Crear documento electrónico",exact:true})).toBeVisible();
    await expect(page.getByText("Cuaderno A4 rayado",{exact:true})).toBeVisible();await expect(page.getByText("CATÁLOGO MODIFICADO",{exact:true})).toHaveCount(0);
    const items=page.getByRole('region',{name:'Artículos e importes persistidos',exact:true});
    const lastAmount=items.getByRole('cell',{name:'S/ 9.00',exact:true});await lastAmount.scrollIntoViewIfNeeded();await expect(lastAmount).toBeInViewport();
    await items.evaluate(element=>element.scrollLeft=0);
    await page.screenshot({path:path.join(evidence,"detail-"+viewport.width+".png"),fullPage:true});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
    await page.getByRole("link",{name:"Estado documental",exact:true}).click();await expect(page).toHaveURL(/ventas\/81\?.*#sale-documents/);
    await page.getByRole("link",{name:"Volver al listado",exact:true}).click();
    await expect(page.getByLabel("Estado comercial",{exact:true})).toHaveValue("COMPLETED");
    await verifyNoWrites(state);
  });
}
test("document shortcut reaches its offscreen target with mouse and keyboard without writes",async({page})=>{
  await page.setViewportSize({width:1440,height:768});
  const state=await setup(page);
  state.sale.items.push(...Array.from({length:12},(_,index)=>({...state.sale.items[0],id:index+3,productId:index+3,
    productNameSnapshot:"Artículo sintético adicional "+(index+3),quantity:1,quantityText:"1",unitPrice:0,discountAmount:0,lineTotal:0})));
  await page.goto("/ventas/81?salesStatus=COMPLETED&salesCash=7");
  await expect(page.getByText("Sin documento electrónico registrado",{exact:true})).toBeVisible();
  const shortcut=page.getByRole("link",{name:"Estado documental",exact:true});
  const heading=page.getByRole("heading",{name:"Documento electrónico",exact:true});
  await shortcut.scrollIntoViewIfNeeded();await expect(heading).not.toBeInViewport();
  await shortcut.click();await expect(heading).toBeInViewport({ratio:1});await expect(heading).toBeFocused();
  await expect(page).toHaveURL(/salesStatus=COMPLETED&salesCash=7#sale-documents$/);
  // A second activation must also work when the fragment is already current.
  await shortcut.focus();await shortcut.scrollIntoViewIfNeeded();await expect(heading).not.toBeInViewport();
  await page.keyboard.press("Enter");await expect(heading).toBeInViewport({ratio:1});await expect(heading).toBeFocused();
  await mkdir(evidence,{recursive:true});await page.locator("#sale-documents").screenshot({path:path.join(evidence,"document-shortcut-target.png")});
  await page.getByRole("link",{name:"Volver al listado",exact:true}).click();
  await expect(page.getByLabel("Estado comercial",{exact:true})).toHaveValue("COMPLETED");
  await expect(page.getByLabel("Sesión de caja",{exact:true})).toHaveValue("7");
  await verifyNoWrites(state);
});
test("document failure is not absence; retry and fiscal states keep conservative actions",async({page})=>{
  const state=await setup(page);state.documents({message:"synthetic"},500);await page.goto("/ventas/81?salesCash=7");
  await expect(page.getByText("No se pudo verificar el estado documental. Reintenta la consulta.",{exact:true})).toBeVisible();
  await expect(page.getByRole("link",{name:"Crear documento electrónico",exact:true})).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Anular venta",exact:true})).toBeDisabled();
  await mkdir(evidence,{recursive:true});await page.locator('#sale-documents').screenshot({path:path.join(evidence,"detail-document-error.png")});
  state.documents([fiscalDocument()]);await page.getByRole("button",{name:"Reintentar consulta documental",exact:true}).click();
  await expect(page.getByText("Borrador · no emitido",{exact:true})).toBeVisible();
  await expect(page.getByRole("link",{name:"Ver documento electrónico",exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Anular venta",exact:true})).toBeDisabled();
  await page.getByRole("link",{name:"Ver documento electrónico",exact:true}).click();await expect(page).toHaveURL(/facturacion\/comprobantes\/901/);
  await page.getByRole("link",{name:"#81",exact:true}).click();await expect(page).toHaveURL(/ventas\/81\?salesCash=7/);
  await verifyNoWrites(state);
});
for(const role of ["CAJERO","SUPERVISOR","ADMIN","ALMACENERO"])test("existing commercial route/action role "+role,async({page})=>{
  const state=await setup(page,[role]);await page.goto("/ventas/81");
  if(role==="ALMACENERO"){
    await expect(page).toHaveURL(/dashboard/);await expect(page.getByRole("heading",{name:"Venta #81",exact:true})).toHaveCount(0);
    expect(state.reads()).toBe(0);
  } else {
    await expect(page.getByRole("link",{name:"Crear documento electrónico",exact:true})).toBeVisible();
    await expect(page.getByRole("link",{name:"Anular venta",exact:true})).toHaveCount(role==="CAJERO"?0:1);
  }
  await verifyNoWrites(state);
});
test("keyboard and note return preserve the list context without a commercial write",async({page})=>{
  const state=await setup(page);await page.goto("/ventas/81?salesCash=7");
  await expect(page.getByRole("heading",{name:"Venta #81",exact:true})).toBeFocused();
  await page.keyboard.press("Tab");await expect(page.getByRole("link",{name:"Volver al listado",exact:true})).toBeFocused();
  await page.getByRole("link",{name:"Ver nota interna",exact:true}).click();
  await expect(page.getByRole("heading",{name:"NOTA DE VENTA",exact:true})).toBeVisible();
  await page.getByRole("link",{name:"Volver al detalle",exact:true}).click();
  await page.getByRole("link",{name:"Volver al listado",exact:true}).click();
  await expect(page.getByLabel("Sesión de caja",{exact:true})).toHaveValue("7");
  await verifyNoWrites(state);
});
