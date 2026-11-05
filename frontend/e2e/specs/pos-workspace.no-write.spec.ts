import { test, expect, Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { noteSale } from "../../src/app/features/sales/internal-note/note-test-data";
const evidence=path.join(os.tmpdir(),"inktoy-ux-pos-2-revalidation","regression-visual");
async function setup(page:Page,theme="dark") {
  const writes:string[]=[], errors:string[]=[], unexpected:string[]=[];
  const state={cash:"open",search:"ok",operations:"ok",operationState:"COMPLETED",attentionQueries:0,lookupQueries:0};
  const id="00000000-0000-4000-8000-000000000081";
  const sale=noteSale(2);sale.id=81;
  const product={productId:1,name:"Cuaderno sintético A4",sku:"SYN-A4",barcode:"SYN-001",salePrice:6,stockAvailable:50,quantityPolicy:"WHOLE"};
  const operation=()=>({operationId:id,protocolVersion:1,origin:"POS",state:state.operationState,cashRegisterSessionId:7,saleId:state.operationState==="COMPLETED"?81:null,quoteId:null,
    command:state.operationState==="PREPARED"?{operationId:id,warehouseId:1,confirmedTotal:6,items:[{productId:1,quantity:1,confirmedUnitPrice:6}],payments:[{paymentMethod:"CASH",amount:6}]}:null,
    quoteCommand:null,receiptIntent:{receiptType:"TICKET",payload:null},documentId:null,documentStatus:null,receiptState:"NOT_REQUIRED",createdAt:"2026-10-31T15:00:00Z",updatedAt:"2026-10-31T15:00:00Z"});
  page.on("pageerror",e=>errors.push(e.message));
  await page.addInitScript(theme=>{localStorage.setItem("erp_pos_token","synthetic-ux-pos");localStorage.setItem("erp_pos_theme",theme);},theme);
  await page.context().route("**/api/**",async route=>{
    const req=route.request(),url=new URL(req.url()),p=url.pathname;
    if(req.method()!=="GET"){writes.push(req.method()+" "+p);await route.abort();return;}
    expect(req.headers()["authorization"]).toBe("Bearer synthetic-ux-pos");
    if(p.endsWith("/auth/me"))return route.fulfill({json:{id:"synthetic-owner",username:"qa.pos",email:"qa@example.invalid",roles:["CAJERO"]}});
    if(p.endsWith("/warehouses"))return route.fulfill({json:[{id:1,code:"SYN",name:"Tienda sintética",active:true,type:"STORE"},{id:2,code:"SYN-2",name:"Depósito sintético",active:true,type:"WAREHOUSE"}]});
    if(p.endsWith("/cash-registers/current"))return route.fulfill(state.cash==="open"?{json:{id:7,status:"OPEN",openedAt:"2026-10-31T13:00:00Z",openedByUserId:"synthetic-owner"}}:state.cash==="closed"?{status:404,json:{message:"No OPEN cash register session for current user"}}:{status:503,json:{message:"Synthetic offline"}});
    if(p.endsWith("/billing/series"))return route.fulfill({json:[]});
    if(p.endsWith("/pos/products/search"))return route.fulfill(state.search==="error"?{status:503,json:{message:"Synthetic offline"}}:{json:state.search==="empty"?[]:[product,{...product,productId:2,name:"Lápices sintéticos",sku:"SYN-LAP",barcode:"SYN-002",salePrice:2.5,quantityPolicy:"DECIMAL_2"},{...product,productId:3,name:"Agotado sintético",sku:"SYN-ZERO",barcode:"SYN-003",stockAvailable:0},{...product,productId:4,name:"Cartulina QA azul",sku:"SYN-CAR",barcode:"SYN-004",salePrice:1.8,stockAvailable:120},{...product,productId:5,name:"Papel de ensayo de dibujo",sku:"SYN-PAP",barcode:"SYN-005",salePrice:4.5,stockAvailable:25},{...product,productId:6,name:"Marcador de prueba",sku:"SYN-MAR",barcode:"SYN-006",salePrice:3.9,stockAvailable:30},{...product,productId:7,name:"Cinta de muestra para nombres largos y lectura completa",sku:"SYN-CIN",barcode:"SYN-007",salePrice:2.5,stockAvailable:15}]});
    if(p.endsWith("/pos/products/snapshot"))return route.fulfill({json:[product,{...product,productId:2,name:'Lápices sintéticos',sku:'SYN-LAP',salePrice:2.5,quantityPolicy:'DECIMAL_2'}].filter(row=>(url.searchParams.get('productIds')||'').split(',').map(Number).includes(row.productId))});
    if(p.endsWith("/pos/products/lookup")){state.lookupQueries++;return route.fulfill({json:product});}
    if(p.endsWith("/sales/operations")){if(url.searchParams.get("attention")==="true")state.attentionQueries++;
      let items=[operation()];if(url.searchParams.get("attention")==="true")items=items.filter(row=>row.state==="PREPARED");
      if(url.searchParams.get("state"))items=items.filter(row=>row.state===url.searchParams.get("state"));
      return route.fulfill(state.operations==="error"?{status:503,json:{message:"Synthetic offline"}}:{json:{items,page:0,size:10,totalItems:items.length,totalPages:items.length?1:0}});}
    if(p.endsWith("/sales/operations/"+id))return route.fulfill({json:operation()});
    if(p.endsWith("/sales/81"))return route.fulfill({json:sale});
    if(p.endsWith("/billing/documents"))return route.fulfill({json:[]});
    unexpected.push(p);return route.abort();
  });
  return {state,writes,errors,unexpected,operation};
}
async function shot(page:Page,name:string){await mkdir(evidence,{recursive:true});await page.screenshot({path:path.join(evidence,name+".png"),fullPage:await page.locator('[aria-modal="true"]').count()===0});}
function clean(s:Awaited<ReturnType<typeof setup>>){expect(s.writes).toEqual([]);expect(s.errors).toEqual([]);expect(s.unexpected).toEqual([]);}
for(const v of [{width:1440,height:900},{width:1024,height:768},{width:768,height:1024},{width:390,height:844},{width:320,height:844}]) {
 test("no-write workspace keyboard, cart, mixed payments and confirmation "+v.width,async({page})=>{
  await page.setViewportSize(v);const s=await setup(page);await page.goto("/pos");
  const pay=page.getByRole("button",{name:"COBRAR",exact:true});await expect(pay).toBeDisabled();await expect(page.getByRole("button",{name:"Descartar carrito",exact:true})).toBeDisabled();
  await shot(page,"empty-"+v.width);
  const search=page.getByLabel("Buscar producto por nombre, SKU o código",{exact:true});await search.fill("sintético");await search.press("Enter");
  await expect(page.getByRole("button",{name:"Sin stock",exact:true})).toBeDisabled();
  const results=page.locator("app-pos-search-results");await expect(results.locator('.result-card')).toHaveCount(7);
  const quick=page.locator('app-pos-search-panel');await expect(quick.locator('.quick-search__buttons button')).toHaveCount(3);
  if(v.width<=520){const geometry=await quick.locator('.quick-search__buttons button,summary').evaluateAll(elements=>elements.map(e=>({text:e.textContent,width:e.getBoundingClientRect().width,top:e.getBoundingClientRect().top,parentWidth:e.closest('.quick-search')!.getBoundingClientRect().width})));await mkdir(evidence,{recursive:true});await writeFile(path.join(evidence,'quick-'+v.width+'.json'),JSON.stringify(geometry));expect(new Set(geometry.map(e=>Math.round(e.top))).size).toBe(1);}
  const more=quick.locator('summary');await more.focus();await more.press('Enter');await expect(quick.locator('details')).toHaveAttribute('open','');
  expect(await quick.locator('.more-searches-list').evaluate(element=>{const r=element.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;})).toBe(true);
  await more.press('Escape');await expect(quick.locator('details')).not.toHaveAttribute('open','');await expect(more).toBeFocused();
  if(v.width===1440){const visible=await results.locator('.result-card').evaluateAll(rows=>rows.filter(row=>{const r=row.getBoundingClientRect(),g=row.parentElement!.getBoundingClientRect();return r.top>=Math.max(0,g.top)&&r.bottom<=Math.min(innerHeight,g.bottom);}).length);expect(visible).toBeGreaterThanOrEqual(5);await mkdir(evidence,{recursive:true});await writeFile(path.join(evidence,"density-1440.json"),JSON.stringify({visible,total:7,viewport:v}));}
  await results.getByRole("button",{name:"Agregar",exact:true}).first().click();
  await results.getByRole("button",{name:"Agregar",exact:true}).nth(1).click();
  const cart=page.locator("app-pos-cart-panel");await cart.getByLabel("Cantidad del producto",{exact:true}).nth(1).fill("1.25");
  await cart.getByLabel("Descuento del producto",{exact:true}).first().fill("1");await expect(pay).toBeEnabled();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  expect(await page.locator(".result-card,.cart-item").evaluateAll(rows=>rows.filter(row=>row.scrollWidth>row.clientWidth+1).length)).toBe(0);
  if(v.width<=900){
    const jump=page.getByRole("button",{name:/^Compra ·/});await jump.click();
    const purchase=page.getByRole("complementary",{name:"Carrito y cobro",exact:true});await expect(purchase).toBeFocused();
    const panelBox=await purchase.boundingBox(),jumpBox=await jump.boundingBox();expect(panelBox!.y).toBeGreaterThanOrEqual(jumpBox!.y+jumpBox!.height);
    await page.getByRole("button",{name:"Buscar productos",exact:true}).click();await expect(search).toBeFocused();
  }
  await shot(page,"cart-"+v.width);
  const launcher=page.getByRole("button",{name:"Ver carrito completo",exact:true});await launcher.click();
  const full=page.getByRole("dialog",{name:"Carrito completo",exact:true}),close=full.getByRole("button",{name:"Cerrar",exact:true});await expect(close).toBeFocused();
  await page.keyboard.press("Shift+Tab");await expect(full.getByRole("button",{name:"Quitar",exact:true}).last()).toBeFocused();
  await page.keyboard.press("Tab");await expect(close).toBeFocused();await shot(page,"full-cart-"+v.width);
  await page.keyboard.press("Escape");await expect(full).toHaveCount(0);await expect(launcher).toBeFocused();
  await pay.click();const checkout=page.getByRole("dialog",{name:"Cobrar venta",exact:true});await expect(checkout).toBeVisible();
  await expect(checkout.getByRole("button",{name:/^Nota de venta/})).toBeVisible();
  await checkout.getByLabel("Monto *",{exact:true}).fill("5");await checkout.getByRole("button",{name:"+ Pago",exact:true}).click();
  await checkout.getByRole("combobox",{name:"Método *",exact:true}).nth(1).selectOption("CARD");await checkout.getByLabel("Monto *",{exact:true}).nth(1).fill("3.13");
  await shot(page,"checkout-"+v.width);await expect(checkout.getByRole("button",{name:"Confirmar venta",exact:true})).toBeEnabled();
  await expect(page.getByRole("dialog",{name:"Confirmar venta",exact:true})).toHaveCount(0);
  await shot(page,"financial-confirmation-"+v.width);
  await checkout.getByRole("button",{name:"Cerrar",exact:true}).click();
  await page.getByRole("button",{name:"Descartar carrito",exact:true}).click();const discard=page.getByRole("alertdialog",{name:"Descartar carrito",exact:true});
  await discard.getByRole("button",{name:"Conservar carrito",exact:true}).click();await expect(cart.locator("app-pos-cart-item")).toHaveCount(2);
  clean(s);
 });
}
test("owner operations panel, completed history remains separate from the next cart",async({page})=>{
 const s=await setup(page);await page.goto('/pos');const search=page.getByLabel('Buscar producto por nombre, SKU o código',{exact:true});
 await search.fill('SYN-001');await page.getByRole('button',{name:'Agregar por código',exact:true}).click();
 const before=await page.evaluate(()=>{const d=JSON.parse(sessionStorage.getItem('erp_pos_sales_draft_v1')!);return {cart:d.cart.map((line:any)=>[line.productId,line.quantity,line.discountAmount]),payments:d.payments.map((p:any)=>[p.paymentMethod,p.amount,p.reference]),last:d.lastSaleId};});
 const operations=page.locator('app-sale-operation-recovery > button');await operations.click();const panel=page.getByRole('dialog',{name:'Operaciones',exact:true});await panel.getByRole('button',{name:'Actualizar',exact:true}).click();
 await expect(panel).toContainText('No se encontraron operaciones por atender');await panel.getByLabel('Filtrar operaciones',{exact:true}).selectOption('COMPLETED');
 await expect(panel.getByRole('button',{name:'Continuar documento',exact:true})).toHaveCount(0);
 await panel.getByRole('link',{name:'Ver venta #81',exact:true}).click();await expect(page.getByRole('heading',{name:'Venta #81',exact:true})).toBeVisible();
 await page.goBack();await expect(page.locator('app-pos-cart-panel app-pos-cart-item')).toHaveCount(1);
 const after=await page.evaluate(()=>{const d=JSON.parse(sessionStorage.getItem('erp_pos_sales_draft_v1')!);return {cart:d.cart.map((line:any)=>[line.productId,line.quantity,line.discountAmount]),payments:d.payments.map((p:any)=>[p.paymentMethod,p.amount,p.reference]),last:d.lastSaleId};});
 expect(after).toEqual(before);await expect(page.locator('app-pos-sale-note [role="dialog"]')).toHaveCount(0);await shot(page,'historical-next-cart');clean(s);
});
test("cash error, retry, certified closure, search error and empty results",async({page})=>{
 const s=await setup(page);s.state.cash="error";await page.goto("/pos");await expect(page.locator('.pos-context > [data-state="error"]')).toBeVisible();await expect(page.getByRole("button",{name:"COBRAR",exact:true})).toBeDisabled();await shot(page,"cash-error");
 s.state.cash="closed";await page.locator('.pos-cash-details > summary').click();await page.getByRole("button",{name:"Reintentar caja",exact:true}).click();await page.locator('.pos-cash-details > summary').press('Escape');await expect(page.locator('.pos-context > [data-state="closed"]')).toBeVisible();
 s.state.search="error";const search=page.getByLabel("Buscar producto por nombre, SKU o código",{exact:true});await search.fill("sintético");await search.press("Enter");await expect(page.getByText("No se pudo consultar",{exact:true})).toBeVisible();await shot(page,"search-error");
 s.state.search="empty";await search.press("Enter");await expect(page.getByText("Sin coincidencias para la búsqueda",{exact:true})).toBeVisible();
 await page.getByRole("button",{name:/^Pendientes/}).click();const panel=page.getByRole("dialog",{name:"Operaciones",exact:true});await panel.getByRole("button",{name:"Actualizar",exact:true}).click();await expect(panel).toContainText('No se encontraron operaciones por atender');s.state.operations="error";
 await panel.getByRole("button",{name:"Actualizar",exact:true}).click();await expect(panel.getByRole("alert")).toBeVisible();await expect(page.locator("app-sale-operation-recovery > button")).toContainText("Sin comprobar");await shot(page,"operations-error");clean(s);
});
test("prepared operation remains visible after closing its panel without resending checkout",async({page})=>{
 const s=await setup(page);s.state.operationState="PREPARED";await page.goto("/pos");await page.getByRole("button",{name:/^Pendientes/}).click();
 const panel=page.getByRole("dialog",{name:"Operaciones",exact:true});await panel.getByRole("button",{name:"Actualizar",exact:true}).click();await panel.getByRole("button",{name:'Revisar preparación',exact:true}).click();
 await panel.getByRole("button",{name:"Revisar preparación",exact:true}).click();
 const confirmation=page.getByRole("alertdialog");await expect(confirmation).toBeVisible();await confirmation.getByRole("button",{name:/Cancelar|Conservar/}).click();
 await panel.getByRole("button",{name:"Cerrar operaciones",exact:true}).click();await expect(page.getByText(/Compra preparada, aún no confirmada/)).toBeVisible();
 await expect(page.getByRole("button",{name:"REVISAR PREPARACIÓN",exact:true})).toHaveCount(1);await shot(page,"prepared-notice");clean(s);
});

test("light theme preserves readable workspace and operation controls",async({page})=>{
 const s=await setup(page,"light");await page.goto("/pos");await expect(page.locator("body")).toHaveAttribute("data-theme","light");
 const search=page.getByLabel("Buscar producto por nombre, SKU o código",{exact:true});await search.fill("sintético");await search.press("Enter");
 await page.locator("app-pos-search-results").getByRole("button",{name:"Agregar",exact:true}).first().click();
 const contrasts=await page.locator("app-pos-page .result-add-button:not(:disabled)").evaluateAll(elements=>{
   const luminance=(value:string)=>{const rgb=value.match(/[0-9.]+/g)!.slice(0,3).map(Number).map(n=>{const c=n/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;});return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];};
   return elements.map(el=>{const style=getComputedStyle(el),a=luminance(style.color),b=luminance(style.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);});
 });expect(contrasts.length).toBe(6);for(const contrast of contrasts)expect(contrast).toBeGreaterThanOrEqual(4.5);
 await shot(page,"light-cart");await page.getByRole("button",{name:/^Pendientes/}).click();
 await expect(page.getByRole("dialog",{name:"Operaciones",exact:true})).toBeVisible();await shot(page,"light-operations");
 await page.keyboard.press("Escape");await expect(page.getByRole("button",{name:/^Pendientes/})).toBeFocused();clean(s);
});

test("exact lookup can repeat legitimately, returns focus and preserves warehouse review guards",async({page})=>{
 const s=await setup(page);await page.goto('/pos');const search=page.getByLabel('Buscar producto por nombre, SKU o código',{exact:true});
 for(let i=0;i<2;i++){await search.fill('SYN-001');await page.getByRole('button',{name:'Agregar por código',exact:true}).click();await expect(search).toBeFocused();await expect(search).toHaveValue('');}
 expect(s.state.lookupQueries).toBe(2);await expect(page.locator('app-pos-cart-panel').getByLabel('Cantidad del producto',{exact:true})).toHaveValue('2');
 await page.locator('app-pos-cart-panel').getByLabel('Descuento del producto',{exact:true}).fill('1');
 await expect(page.locator('app-pos-totals-summary .total-main strong')).toHaveText(/S\/\s*11\.00/);
 const warehouse=page.getByRole('combobox',{name:'Almacén de salida',exact:true});await expect(warehouse).toHaveCount(1);await warehouse.selectOption({label:'Depósito sintético'});
 await expect(page.getByRole('region',{name:'Condiciones de la compra',exact:true})).toContainText('El almacén cambió');
 const quick=page.locator('app-pos-search-panel');await quick.locator('summary').click();const term=quick.locator('.more-searches-list button').first();const text=(await term.textContent())!.trim();await term.click();await expect(search).toBeFocused();await expect(search).toHaveValue(text);
 await shot(page,'lookup-and-warehouse-review');clean(s);
});

for(const viewport of [{width:1440,height:900,theme:'light'},{width:390,height:844,theme:'dark'},{width:320,height:844,theme:'light'}]){
 test('UM-01 user menu receives clicks above POS while checkout covers the header '+viewport.width,async({page})=>{
  await page.setViewportSize(viewport);const s=await setup(page,viewport.theme);await page.goto('/pos');
  const search=page.getByLabel('Buscar producto por nombre, SKU o código',{exact:true});await search.fill('sintético');await search.press('Enter');
  await page.locator('app-pos-search-results').getByRole('button',{name:'Agregar',exact:true}).first().click();
  const before=await page.evaluate(()=>sessionStorage.getItem('erp_pos_sales_draft_v1'));
  const menu=page.getByRole('button',{name:/Abrir menú de usuario/});await menu.click();
  const logout=page.getByRole('menuitem',{name:'Cerrar sesion',exact:true});await expect(logout).toBeVisible();await expect(logout).toBeEnabled();
  const hit=await logout.evaluate(el=>{const r=el.getBoundingClientRect(),target=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {receivesPointer:!!target&&(target===el||el.contains(target)),interceptor:target?.tagName};});
  expect(hit.receivesPointer).toBe(true);
  const directory=path.join(os.tmpdir(),'inktoy-ux-pos-2-user-menu-layer');await mkdir(directory,{recursive:true});
  await page.screenshot({path:path.join(directory,'menu-'+viewport.width+'.png')});
  await menu.click();await expect(logout).toHaveCount(0);expect(await page.evaluate(()=>sessionStorage.getItem('erp_pos_sales_draft_v1'))).toBe(before);
  await page.getByRole('button',{name:'COBRAR',exact:true}).click();const checkout=page.getByRole('dialog',{name:'Cobrar venta',exact:true});await expect(checkout).toBeVisible();
  const header=await menu.boundingBox();expect(header).not.toBeNull();
  await expect(page.locator('.topbar')).toHaveJSProperty('inert',true);
  // On compact pages the header can scroll above the viewport; its nearest visible point must still be covered.
  const headerPoint={x:Math.max(0,Math.min(viewport.width-1,header!.x+header!.width/2)),y:Math.max(0,Math.min(viewport.height-1,header!.y+header!.height/2))};
  expect(await checkout.evaluate((el,point)=>{const target=document.elementFromPoint(point.x,point.y);return !!target&&el.contains(target);},headerPoint)).toBe(true);
  await page.screenshot({path:path.join(directory,'checkout-above-header-'+viewport.width+'.png')});
  await page.keyboard.press('Escape');await expect(checkout).toHaveCount(0);await expect(page.locator('.topbar')).toHaveJSProperty('inert',false);expect(await page.evaluate(()=>sessionStorage.getItem('erp_pos_sales_draft_v1'))).toBe(before);
  await menu.click();await logout.click();await expect(page).toHaveURL(/\/login$/);expect(await page.evaluate(()=>localStorage.getItem('erp_pos_token'))).toBeNull();clean(s);
  await writeFile(path.join(directory,'menu-'+viewport.width+'.json'),JSON.stringify({viewport,hit,writes:s.writes,unexpected:s.unexpected,errors:s.errors,logoutRoute:page.url()},null,2));
 });
}
