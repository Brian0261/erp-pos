import { test, expect, Page } from "@playwright/test";
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { noteSale } from "../../src/app/features/sales/internal-note/note-test-data";

// All API traffic is intercepted. Only the explicitly confirmed synthetic checkout is fulfilled;
// no request is sent to a backend and any other commercial mutation fails the test.
const evidence=path.join(os.tmpdir(),"inktoy-ux-pos-2-operations-final","related-browser");
const operationId="00000000-0000-4000-8000-000000000091";
const products=[
  {productId:1,name:"Cuaderno sintético A4",sku:"SYN-A4",barcode:"SYN-001",salePrice:6,stockAvailable:50,quantityPolicy:"WHOLE"},
  {productId:2,name:"Lápices sintéticos",sku:"SYN-LAP",barcode:"SYN-002",salePrice:2.5,stockAvailable:50,quantityPolicy:"DECIMAL_2"},
  {productId:3,name:"Agotado sintético",sku:"SYN-ZERO",barcode:"SYN-003",salePrice:1.8,stockAvailable:0,quantityPolicy:"WHOLE"},
];
async function setup(page:Page) {
  const state={historical:"COMPLETED",operationsError:false,allowCheckout:false,electronic:false,creationLost:false,document:"DRAFT",noteError:false,checkoutLost:false,cash:'open',receiptState:'NOT_REQUIRED',receiptType:'TICKET' as string|null,operationDocumentId:null as number|null,operationDocumentStatus:null as string|null,operationsEmpty:false,operationDetailError:false,manyProducts:false};
  const catalog=()=>state.manyProducts?[...products,...Array.from({length:11},(_,i)=>({productId:i+4,name:'Producto sintético '+(i+4),sku:'SYN-'+(i+4),barcode:i===0?'SYN-4':'BAR-'+(i+4),salePrice:1+i/10,stockAvailable:50,quantityPolicy:'WHOLE'}))]:products;
  const reads:string[]=[];
  const writes:string[]=[],unexpected:string[]=[],errors:string[]=[];let preparation:any=null;
  const fixtureSale=noteSale(2);fixtureSale.id=81;
  const document=()=>({id:901,saleId:81,billingSeriesId:preparation?.receiptIntent.payload?.billingSeriesId??21,documentType:preparation?.receiptIntent.receiptType??'INVOICE',status:state.document,environment:"BETA",series:preparation?.receiptIntent.receiptType==='RECEIPT'?'B-SYN':'F-SYN',number:1,fullNumber:preparation?.receiptIntent.receiptType==='RECEIPT'?'B-SYN-1':'F-SYN-1',
    customerName:"Cliente sintético",customerDocument:"20123456789",subtotalAmount:fixtureSale.subtotalAmount,taxAmount:0,totalAmount:fixtureSale.totalAmount,
    xmlGeneratedAt:null,signedAt:null,sentAt:null,providerTicket:null,providerMessage:null,createdAt:"2026-11-01T01:00:00Z",updatedAt:"2026-11-01T01:00:00Z",items:[]});
  const historical=()=>({operationId,protocolVersion:1,origin:"POS",state:state.historical,cashRegisterSessionId:7,saleId:state.historical==="COMPLETED"?81:null,quoteId:null,
    command:state.historical==="PREPARED"?{operationId,warehouseId:1,confirmedTotal:4.5,items:[{productId:991,quantity:1,discountAmount:0,confirmedUnitPrice:4.5}],payments:[{paymentMethod:"CASH",amount:4.5}]}:null,
    quoteCommand:null,receiptIntent:state.receiptType?{receiptType:state.receiptType,payload:state.receiptType==='TICKET'?null:{documentType:state.receiptType,billingSeriesId:21}}:null,documentId:state.operationDocumentId,documentStatus:state.operationDocumentStatus,receiptState:state.receiptState,createdAt:"2026-11-01T01:00:00Z",updatedAt:"2026-11-01T01:00:00Z"});
  const active=()=>({...preparation,state:preparation?.completed?"COMPLETED":"PREPARED",cashRegisterSessionId:7,saleId:preparation?.completed?81:null,quoteId:null,quoteCommand:null,
    command:preparation?.completed?null:preparation.command,documentId:preparation?.documentId??null,documentStatus:preparation?.documentId?state.document:null,
    receiptState:preparation?.receiptIntent.receiptType==="TICKET"?"NOT_REQUIRED":preparation?.documentId?"LOCATED":"PENDING",createdAt:"2026-11-01T02:00:00Z",updatedAt:"2026-11-01T02:00:00Z"});
  page.on("pageerror",error=>errors.push(error.message));
  await page.addInitScript(()=>{localStorage.setItem("erp_pos_token","synthetic-p1-owner");localStorage.setItem("erp_pos_theme","dark");});
  await page.context().route("**/api/**",async route=>{
    const request=route.request(),url=new URL(request.url()),p=url.pathname;
    expect(request.headers()["authorization"]).toBe("Bearer synthetic-p1-owner");
    if(request.method()!=="GET"){
      writes.push(request.method()+" "+p);
      if(state.allowCheckout&&request.method()==="POST"&&p.endsWith("/sales/operations")){
        preparation=request.postDataJSON();return route.fulfill({status:201,json:active()});
      }
      if(state.allowCheckout&&request.method()==="POST"&&p.endsWith("/sales")){
        const command=request.postDataJSON();expect(command).toEqual(preparation.command);expect(command.operationId).toBe(preparation.operationId);
        preparation.completed=true;
        Object.assign(fixtureSale,{cashRegisterSessionId:7,warehouseId:command.warehouseId,status:"COMPLETED",totalAmount:command.confirmedTotal,
          subtotalAmount:15.13,discountAmount:1,paidAmount:command.payments.reduce((sum:number,p:any)=>sum+Math.round(p.amount*100),0)/100,changeAmount:command.payments.reduce((sum:number,p:any)=>sum+Math.round(p.amount*100),0)/100-command.confirmedTotal,createdBy:"qa.pos",
          items:command.items.map((line:any,index:number)=>{const product=products.find(product=>product.productId===line.productId)!;
            return {id:index+1,productId:line.productId,productName:product.name,sku:product.sku,barcode:product.barcode,
              productNameSnapshot:product.name,skuSnapshot:product.sku,quantity:line.quantity,quantityText:String(line.quantity),
              unitPrice:line.confirmedUnitPrice,discountAmount:line.discountAmount,lineTotal:index===0?11:3.13};}),
          payments:command.payments.map((payment:any,index:number)=>({...payment,id:index+1,createdAt:"2026-11-01T02:00:00Z"}))});
        return route.fulfill(state.checkoutLost?{status:504,json:{message:"Synthetic lost checkout response"}}:{status:201,json:fixtureSale});
      }
      if(state.allowCheckout&&state.electronic&&request.method()==="POST"&&p.endsWith("/billing/documents/from-sale/81")){
        expect(preparation.completed).toBe(true);expect(request.postDataJSON()).toEqual(preparation.receiptIntent.payload);
        if(state.creationLost)return route.fulfill({status:504,json:{message:"Synthetic unknown document creation"}});
        preparation.documentId=901;return route.fulfill({status:201,json:document()});
      }
      unexpected.push(request.method()+" "+p);return route.abort();
    }
    reads.push(p+url.search);
    if(p.endsWith("/auth/me"))return route.fulfill({json:{id:"synthetic-owner",username:"qa.pos",email:"qa@example.invalid",roles:["CAJERO"]}});
    if(p.endsWith("/warehouses"))return route.fulfill({json:[{id:1,code:"SYN",name:"Tienda sintética",active:true,type:"STORE"}]});
    if(p.endsWith("/cash-registers/current"))return route.fulfill(state.cash==='closed'?{status:404,json:{message:'No OPEN cash register session for current user'}}:state.cash==='error'?{status:503,json:{message:'Synthetic offline'}}:{json:{id:7,status:"OPEN",openedByUserId:"synthetic-owner",openedAt:"2026-11-01T01:00:00Z"}});
    if(p.endsWith("/billing/series"))return route.fulfill({json:[{id:21,version:0,documentType:"INVOICE",series:"F-SYN",currentNumber:1,environment:"BETA",active:true},{id:22,version:0,documentType:"RECEIPT",series:"B-SYN",currentNumber:1,environment:"BETA",active:true}]});
    if(p.endsWith("/pos/products/snapshot"))return route.fulfill({json:catalog().filter(row=>(url.searchParams.get('productIds')||'').split(',').map(Number).includes(row.productId))});
    if(p.endsWith("/pos/products/search"))return route.fulfill({json:catalog()});
    if(p.endsWith("/sales/operations")){
      if(state.operationsError)return route.fulfill({status:503,json:{message:"Synthetic unavailable"}});
      let rows=state.operationsEmpty?[]:[historical()];if(url.searchParams.get("attention")==="true")rows=rows.filter(row=>row.state==="PREPARED"||(row.state==='COMPLETED'&&row.receiptIntent?.receiptType!=='TICKET'&&row.receiptIntent!==null&&!row.documentId));
      const filter=url.searchParams.get("state");if(filter)rows=rows.filter(row=>row.state===filter);
      return route.fulfill({json:{items:rows.map(row=>({...row,command:null,receiptIntent:row.receiptIntent?{...row.receiptIntent,payload:null}:null})),page:0,size:10,totalItems:rows.length,totalPages:rows.length?1:0}});
    }
    if(p.endsWith("/sales/operations/"+operationId))return route.fulfill(state.operationDetailError?{status:403,json:{message:'Synthetic denied operation metadata'}}:{json:historical()});
    if(preparation&&p.endsWith("/sales/operations/"+preparation.operationId))return route.fulfill({json:active()});
    if(p.endsWith("/sales/81"))return route.fulfill(state.noteError?{status:403,json:{message:"Synthetic denied note"}}:{json:fixtureSale});
    if(p.endsWith("/billing/documents"))return route.fulfill(state.document==="error"?{status:503,json:{message:"Synthetic document read failure"}}:
      {json:state.document==="pending"?[]:state.electronic?[document()]:[]});
    unexpected.push(p);return route.abort();
  });
  return {state,writes,unexpected,errors,reads};
}
async function capture(page:Page,name:string){await mkdir(evidence,{recursive:true});
  if(await page.locator('[aria-modal="true"]').count())await page.screenshot({path:path.join(evidence,name+'.png')});
  else await page.locator('app-pos-page').screenshot({path:path.join(evidence,name+'.png')});}
function clean(s:Awaited<ReturnType<typeof setup>>){expect(s.unexpected).toEqual([]);expect(s.errors).toEqual([]);}
const cart=(page:Page)=>page.locator('app-pos-cart-panel');
for (const width of [1440,390,320]) test('PR11 P2-B recovered result stays visible and closing preserves the next purchase '+width,async({page})=>{
  await page.setViewportSize({width,height:width===1440?900:844});const s=await setup(page);s.state.allowCheckout=true;s.state.checkoutLost=true;
  await page.goto('/pos');await purchaseB(page);await completeCheckout(page);
  await expect(page.getByRole('dialog',{name:'Cobrar venta',exact:true}).getByRole('alert')).toBeVisible();
  const original=await draft(page);expect(original.pending).not.toBeNull();
  await page.reload();await page.getByRole('button',{name:'COMPROBAR RESULTADO',exact:true}).click();
  await expect(page.getByRole('button',{name:'FINALIZAR RECUPERACIÓN',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'FINALIZAR RECUPERACIÓN',exact:true}).click();
  await expect.poll(async()=>{const d=await draft(page);return [d.pending,d.recovery,d.lines.length];}).toEqual([null,null,0]);
  const result=page.getByRole('region',{name:'Resultado de recuperación',exact:true});
  await expect(result).toContainText('Venta #81 recuperada y confirmada');
  await expect(result.getByRole('link',{name:'Ver venta #81',exact:true})).toHaveAttribute('href','/ventas/81');
  await expect(result).toBeFocused(); await expect(result).toBeInViewport();
  await expect(result.getByRole('status')).toBeInViewport({ratio:1});
  await expect(page.locator('app-pos-sale-note [role="dialog"]')).toHaveCount(0);
  expect(s.writes).toEqual(['POST /api/v1/sales/operations','POST /api/v1/sales']);
  const evidence=path.join(os.tmpdir(),'inktoy-ux-pos-2-pr11-fix');await mkdir(evidence,{recursive:true});
  await page.screenshot({path:path.join(evidence,'p2-b-'+width+'.png')});
  await purchaseB(page);const before=await draft(page);
  await result.getByRole('button',{name:'Cerrar confirmación de recuperación',exact:true}).click();
  await expect(result).toHaveCount(0);expect(await draft(page)).toEqual(before);
  expect(s.writes).toEqual(['POST /api/v1/sales/operations','POST /api/v1/sales']);clean(s);
});
async function purchaseB(page:Page){
  const search=page.getByLabel('Buscar producto por nombre, SKU o código',{exact:true});await search.fill('sintético');await search.press('Enter');
  const adds=page.locator('app-pos-search-results').getByRole('button',{name:'Agregar',exact:true});await adds.first().click();await adds.nth(1).click();
  await cart(page).getByLabel('Cantidad del producto',{exact:true}).first().fill('2');
  await cart(page).getByLabel('Cantidad del producto',{exact:true}).nth(1).fill('1.25');
  await cart(page).getByLabel('Descuento del producto',{exact:true}).first().fill('1');
  await page.getByRole('button',{name:'COBRAR',exact:true}).click();const checkout=page.getByRole('dialog',{name:'Cobrar venta',exact:true});
  await checkout.getByLabel('Monto *',{exact:true}).fill('10');await checkout.getByRole('button',{name:'+ Pago',exact:true}).click();
  await checkout.getByRole('combobox',{name:'Método *',exact:true}).nth(1).selectOption('CARD');await checkout.getByLabel('Monto *',{exact:true}).nth(1).fill('4.13');
  await checkout.getByRole('button',{name:'Cerrar',exact:true}).click();
}
async function draft(page:Page){return page.evaluate(()=>{const d=JSON.parse(sessionStorage.getItem('erp_pos_sales_draft_v1')!);return {
  lines:d.cart.map((line:any)=>[line.productId,String(line.quantity),String(line.discountAmount),String(line.salePrice)]),
  payments:d.payments.map((payment:any)=>[payment.paymentMethod,String(payment.amount),payment.reference]),warehouse:d.warehouseId,
  pending:d.pendingSaleRequest?.operationId??null,recovery:d.receiptRecovery?.operationId??null,last:d.lastSaleId};});}
async function completeCheckout(page:Page,electronic=false){
  await page.getByRole('button',{name:'COBRAR',exact:true}).click();const checkout=page.getByRole('dialog',{name:'Cobrar venta',exact:true});
  if(electronic){await checkout.getByRole('button',{name:'Factura electrónica',exact:true}).click();await checkout.getByRole('combobox',{name:/^Serie de comprobante \*/}).selectOption('21');
    await checkout.getByLabel(/^RUC \*/).fill('20123456789');await checkout.getByLabel(/^Razón social \*/).fill('Cliente sintético');}
  await checkout.getByRole('button',{name:'Confirmar venta',exact:true}).click();
}

const paymentEvidence=path.join(os.tmpdir(),'inktoy-ux-pos-2-payment-validation');
async function paymentShot(page:Page,name:string){
  await mkdir(paymentEvidence,{recursive:true});await page.screenshot({path:path.join(paymentEvidence,name+'.png')});
  const fields=await page.locator('.payment-line input[type="number"]').evaluateAll(inputs=>inputs.map(input=>{
    const field=input as HTMLInputElement,id=field.getAttribute('aria-describedby');return {value:field.value,invalid:field.getAttribute('aria-invalid'),description:id?document.getElementById(id)?.textContent:null};
  }));await writeFile(path.join(paymentEvidence,name+'.json'),JSON.stringify({viewport:page.viewportSize(),fields},null,2));
}
for(const width of [1440,390])test('PAY-01 current field errors, mixed payments and close/reopen '+width,async({page})=>{
  await page.setViewportSize({width,height:width===1440?900:844});const s=await setup(page);await page.goto('/pos?ngsw-bypass=true');
  const search=page.getByLabel('Buscar producto por nombre, SKU o código',{exact:true});await search.fill('sintético');await search.press('Enter');
  await page.locator('app-pos-search-results').getByRole('button',{name:'Agregar',exact:true}).first().click();
  await page.getByRole('button',{name:'COBRAR',exact:true}).click();const modal=page.getByRole('dialog',{name:'Cobrar venta',exact:true});
  const amount=modal.getByLabel('Monto *',{exact:true}).first(),confirm=modal.getByRole('button',{name:'Confirmar venta',exact:true});
  const fields=modal.locator('.payment-amount-error');await expect(fields).toHaveCount(0);
  await amount.fill('');await expect(amount).toHaveAttribute('aria-invalid','true');await expect(amount).toBeFocused();
  await expect(fields).toHaveText(['Ingresa un monto válido.']);await expect(modal.getByRole('alert')).toHaveCount(0);await expect(confirm).toBeDisabled();
  const id=await amount.getAttribute('aria-describedby');expect(id).toBeTruthy();await expect(page.locator('#'+id)).toHaveText('Ingresa un monto válido.');
  await expect(modal.getByRole('status')).toHaveText('Revisa los montos de pago indicados.');await paymentShot(page,'after-empty-'+width);
  const amountBox=await amount.boundingBox(),methodBox=await modal.getByRole('combobox',{name:'Método *',exact:true}).first().boundingBox();
  expect(Math.abs(amountBox!.y-methodBox!.y)).toBeLessThan(2);
  await amount.fill('6');await expect(fields).toHaveCount(0);await expect(amount).not.toHaveAttribute('aria-invalid','true');await expect(amount).not.toHaveAttribute('aria-describedby');
  await expect(amount).toBeFocused();await expect(confirm).toBeEnabled();await expect(modal.getByRole('alert')).toHaveCount(0);await paymentShot(page,'after-corrected-'+width);
  await amount.fill('0.001');await expect(confirm).toBeDisabled();await expect(amount).toHaveAttribute('aria-invalid','true');
  await amount.fill('3');await expect(fields).toHaveCount(0);await expect(confirm).toBeDisabled();await expect(modal.locator('.checkout-block-reason')).toContainText('mayor o igual');
  await expect(modal.locator('.payment-panel__metrics')).toContainText(/Pendiente\s*S\/\s*3\.00/);await paymentShot(page,'after-insufficient-'+width);
  await amount.fill('6');await expect(confirm).toBeEnabled();await paymentShot(page,'after-full-'+width);
  await amount.fill('8');await expect(modal.locator('.payment-panel__metrics')).toContainText(/Vuelto\s*S\/\s*2\.00/);await expect(confirm).toBeEnabled();
  await modal.getByRole('combobox',{name:'Método *',exact:true}).first().selectOption('CARD');await expect(confirm).toBeDisabled();
  await expect(modal.locator('.checkout-block-reason')).toContainText('Los pagos electrónicos no pueden superar');
  await modal.getByRole('combobox',{name:'Método *',exact:true}).first().selectOption('CASH');await amount.fill('3');await modal.getByRole('button',{name:'+ Pago',exact:true}).click();
  const second=modal.getByLabel('Monto *',{exact:true}).nth(1);await modal.getByRole('combobox',{name:'Método *',exact:true}).nth(1).selectOption('CARD');
  await second.fill('');await expect(second).toHaveAttribute('aria-invalid','true');await expect(amount).not.toHaveAttribute('aria-invalid','true');await expect(confirm).toBeDisabled();
  await second.fill('3');await expect(fields).toHaveCount(0);await expect(confirm).toBeEnabled();await paymentShot(page,'after-mixed-'+width);
  await second.fill('');await modal.getByRole('button',{name:'Quitar',exact:true}).nth(1).click();await expect(fields).toHaveCount(0);await expect(confirm).toBeDisabled();
  await amount.fill('6');await expect(confirm).toBeEnabled();const before=await draft(page);
  await modal.getByRole('button',{name:'Cerrar',exact:true}).click();await expect(modal).toHaveCount(0);await expect(page.locator('.message-stack [role="alert"]')).toHaveCount(0);
  expect(await draft(page)).toEqual(before);await paymentShot(page,'after-closed-'+width);
  await page.getByRole('button',{name:'COBRAR',exact:true}).click();await expect(amount).toHaveValue('6');await expect(fields).toHaveCount(0);await expect(confirm).toBeEnabled();
  await expect(modal.getByRole('alert')).toHaveCount(0);expect(await draft(page)).toEqual(before);await paymentShot(page,'after-reopened-'+width);
  await amount.fill('');await modal.getByRole('button',{name:'Cerrar',exact:true}).click();await expect(page.locator('.message-stack [role="alert"]')).toHaveCount(0);
  await page.getByRole('button',{name:'COBRAR',exact:true}).click();await expect(amount).toHaveValue('');await expect(amount).toHaveAttribute('aria-invalid','true');await expect(confirm).toBeDisabled();
  await amount.fill('6');await amount.press('Tab');await expect(amount).not.toBeFocused();await page.keyboard.press('Escape');await expect(modal).toHaveCount(0);
  await expect(page.getByRole('button',{name:'COBRAR',exact:true})).toBeFocused();expect(s.writes).toEqual([]);clean(s);
});
test('PAY-02 corrected mixed payment dispatches exactly one immutable synthetic checkout',async({page})=>{
  const s=await setup(page);s.state.allowCheckout=true;await page.goto('/pos?ngsw-bypass=true');await purchaseB(page);
  await page.getByRole('button',{name:'COBRAR',exact:true}).click();const modal=page.getByRole('dialog',{name:'Cobrar venta',exact:true});
  const amount=modal.getByLabel('Monto *',{exact:true}).first(),confirm=modal.getByRole('button',{name:'Confirmar venta',exact:true});
  await amount.fill('');await expect(confirm).toBeDisabled();expect(s.writes).toEqual([]);
  await amount.fill('10');await expect(modal.locator('.payment-amount-error')).toHaveCount(0);await expect(modal.getByRole('alert')).toHaveCount(0);await expect(confirm).toBeEnabled();
  await confirm.click();await expect(page.getByRole('dialog',{name:'Venta #81 · Registrada',exact:true})).toContainText(/Total confirmado: S\/\s*14\.13/);
  expect(s.writes).toEqual(['POST /api/v1/sales/operations','POST /api/v1/sales']);clean(s);
  await writeFile(path.join(paymentEvidence,'after-confirmed-synthetic.json'),JSON.stringify({writes:s.writes,unexpected:s.unexpected,errors:s.errors},null,2));
});

for(const width of [1440,768,390,320])test('P1 delivery modal, note actions and new purchase '+width,async({page})=>{
  await page.setViewportSize({width,height:width===1440?900:width===768?1024:844});const s=await setup(page);s.state.allowCheckout=true;
  await page.goto('/pos?ngsw-bypass=true');await purchaseB(page);await capture(page,'pos-normal-'+width);
  await completeCheckout(page);const delivery=page.getByRole('dialog',{name:'Venta #81 · Registrada',exact:true});
  await expect(delivery).toBeVisible();await expect(delivery).toContainText(/Total confirmado: S\/\s*14\.13/);
  await expect(delivery.getByRole('button',{name:'Cerrar entrega de nota',exact:true})).toBeFocused();
  await page.keyboard.press('Shift+Tab');await expect(delivery.getByRole('button',{name:'Nueva venta',exact:true})).toBeFocused();
  await page.keyboard.press('Tab');await expect(delivery.getByRole('button',{name:'Cerrar entrega de nota',exact:true})).toBeFocused();
  expect(await delivery.evaluate(el=>{const r=el.querySelector('.delivery-card')!.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;})).toBe(true);
  await capture(page,'delivery-'+width);
  if(width===1440){
    for(const format of ['a4','ticket58','ticket80']){
      await delivery.getByLabel('Formato de nota',{exact:true}).selectOption(format);
      await expect(delivery.getByRole('button',{name:'Descargar PDF',exact:true})).toBeEnabled();
      const download=page.waitForEvent('download');await delivery.getByRole('button',{name:'Descargar PDF',exact:true}).click();
      expect((await download).suggestedFilename()).toContain(format);await capture(page,'note-actions-'+format);
    }
    const printDownloads:any[]=[];page.context().on('page',popup=>popup.on('download',download=>printDownloads.push(download)));
    const popupPromise=page.waitForEvent('popup');await delivery.getByRole('button',{name:'Imprimir',exact:true}).click();const popup=await popupPromise;
    await expect(delivery).toContainText('Impresión solicitada al visor');
    await expect.poll(()=>popup.url().startsWith('blob:')||printDownloads.length>0).toBe(true);
    if(printDownloads.length){const file=await readFile((await printDownloads[0].path())!);expect(file.subarray(0,5).toString()).toBe('%PDF-');expect(file.toString('latin1')).toContain('/OpenAction');}
    await capture(page,'print-requested');
    await delivery.getByRole('button',{name:'Cerrar entrega de nota',exact:true}).click();expect(popup.isClosed()).toBe(false);await popup.close();
  }else if(width===390)await page.keyboard.press('Escape');
  else await delivery.getByRole('button',{name:'Nueva venta',exact:true}).click();
  await expect(delivery).toHaveCount(0);
  if(width===768||width===320)await expect(page.getByLabel('Buscar producto por nombre, SKU o código',{exact:true})).toBeFocused();
  await purchaseB(page);const before=await draft(page);await expect(page.locator('app-pos-sale-note [role="dialog"]')).toHaveCount(0);
  await page.reload();await expect(cart(page).locator('app-pos-cart-item')).toHaveCount(2);expect(await draft(page)).toEqual(before);
  await expect(page.locator('app-pos-sale-note [role="dialog"]')).toHaveCount(0);
  expect(s.writes).toEqual(['POST /api/v1/sales/operations','POST /api/v1/sales']);clean(s);
});

test('P1 historical completed A stays read-only before and after navigating back to B',async({page})=>{
  const s=await setup(page);await page.goto('/pos');await purchaseB(page);const before=await draft(page);
  await page.getByRole('button',{name:/^Pendientes/}).click();const panel=page.getByRole('dialog',{name:'Operaciones',exact:true});await panel.getByRole('button',{name:'Actualizar',exact:true}).click();
  await expect(panel).toContainText('No se encontraron operaciones por atender');
  await panel.getByLabel('Filtrar operaciones',{exact:true}).selectOption('COMPLETED');
  await expect(panel.getByRole('button',{name:'Continuar documento',exact:true})).toHaveCount(0);expect(await draft(page)).toEqual(before);await capture(page,'historical-A-purchase-B');
  await panel.getByRole('link',{name:'Ver venta #81',exact:true}).click();await expect(page.getByRole('heading',{name:'Venta #81',exact:true})).toBeVisible();
  await page.goBack();await expect(cart(page).locator('app-pos-cart-item')).toHaveCount(2);expect(await draft(page)).toEqual(before);
  await expect(page.locator('app-pos-sale-note [role="dialog"]')).toHaveCount(0);expect(s.writes).toEqual([]);clean(s);
});

test('P1 PREPARED A leaves B intact until explicit verified discard; resume remains separately confirmed',async({page})=>{
  const s=await setup(page);s.state.historical='PREPARED';await page.goto('/pos');await purchaseB(page);const before=await draft(page);
  await page.getByRole('button',{name:/^Pendientes/}).click();const panel=page.getByRole('dialog',{name:'Operaciones',exact:true});await panel.getByRole('button',{name:'Actualizar',exact:true}).click();
  await panel.getByRole('button',{name:'Revisar preparación',exact:true}).click();expect(await draft(page)).toEqual(before);
  await panel.getByRole('button',{name:'Revisar preparación',exact:true}).click();const decision=page.getByRole('alertdialog',{name:'Tienes otra compra en curso',exact:true});
  await expect(decision).toBeVisible();await expect(decision.getByRole('button',{name:'Volver a mi compra',exact:true})).toBeFocused();
  expect(await draft(page)).toEqual(before);await capture(page,'prepared-A-purchase-B');await decision.getByRole('button',{name:'Volver a mi compra',exact:true}).click();
  expect(await draft(page)).toEqual(before);await panel.getByRole('button',{name:'Revisar preparación',exact:true}).click();
  await decision.getByRole('button',{name:'Descartar mi borrador y recuperar esta preparación',exact:true}).click();
  const confirmation=page.getByRole('alertdialog',{name:'Reanudar preparación',exact:true});await expect(confirmation).toBeVisible();
  await confirmation.getByRole('button',{name:'Conservar',exact:true}).click();const adopted=await draft(page);expect(adopted.pending).toBe(operationId);expect(adopted.lines.map((line:any)=>line[0])).toEqual([991]);
  await panel.getByRole('button',{name:'Cerrar operaciones',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Compra preparada, aún no confirmada');
  await page.getByRole('button',{name:'Dejar pendiente y empezar otra venta',exact:true}).click();await expect(cart(page).locator('app-pos-cart-item')).toHaveCount(0);
  expect(s.writes).toEqual([]);clean(s);
});

test('P1 uncertain checkout keeps its UUID, blocks another recovery, and never opens a delivery',async({page})=>{
  const s=await setup(page);s.state.allowCheckout=true;s.state.checkoutLost=true;s.state.historical='PREPARED';await page.goto('/pos');await purchaseB(page);
  await completeCheckout(page);await expect(page.locator('app-pos-sale-note [role="dialog"]')).toHaveCount(0);
  const before=await draft(page);expect(before.pending).not.toBeNull();await page.getByRole('dialog',{name:'Cobrar venta',exact:true}).getByRole('button',{name:'Cerrar',exact:true}).click();
  await page.getByRole('button',{name:/^Pendientes/}).click();const panel=page.getByRole('dialog',{name:'Operaciones',exact:true});await panel.getByRole('button',{name:'Actualizar',exact:true}).click();
  await panel.getByRole('button',{name:'Revisar preparación',exact:true}).click();await panel.getByRole('button',{name:'Revisar preparación',exact:true}).click();
  expect(await draft(page)).toEqual(before);await panel.getByRole('button',{name:'Cerrar operaciones',exact:true}).click();await capture(page,'uncertain-checkout');
  await page.getByRole('button',{name:'COMPROBAR RESULTADO',exact:true}).click();await expect(page.getByRole('button',{name:'FINALIZAR RECUPERACIÓN',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'FINALIZAR RECUPERACIÓN',exact:true}).click();await expect(cart(page).locator('app-pos-cart-item')).toHaveCount(0);
  await expect(page.locator('app-pos-sale-note [role="dialog"]')).toHaveCount(0);
  expect(s.writes).toEqual(['POST /api/v1/sales/operations','POST /api/v1/sales']);clean(s);
});

test('P1 document error, pending and rejected states never become fiscal acceptance or repeat checkout',async({page})=>{
  const s=await setup(page);s.state.allowCheckout=true;s.state.electronic=true;s.state.creationLost=true;await page.goto('/pos');await purchaseB(page);await completeCheckout(page,true);
  const delivery=page.getByRole('dialog',{name:'Venta #81 · Registrada',exact:true});await expect(delivery).toBeVisible();await expect(delivery).toContainText('Estado documental no verificado');
  s.state.document='error';await delivery.getByRole('button',{name:'Actualizar estado documental',exact:true}).click();await expect(delivery.getByRole('alert')).toContainText('no pudo verificarse');await capture(page,'document-error');
  s.state.document='pending';await delivery.getByRole('button',{name:'Actualizar estado documental',exact:true}).click();await expect(delivery).toContainText('documento pendiente');
  s.state.document='REJECTED';await delivery.getByRole('button',{name:'Actualizar estado documental',exact:true}).click();await expect(delivery).toContainText('Rechazado · Beta · pruebas');
  await expect(delivery).not.toContainText('SUNAT');await expect(delivery).not.toContainText('CDR');
  s.state.noteError=true;await delivery.getByRole('button',{name:'Descargar PDF',exact:true}).click();await expect(delivery).toContainText('No tienes permiso');
  s.state.noteError=false;await delivery.getByRole('button',{name:'Reintentar nota',exact:true}).click();await expect(delivery.getByRole('button',{name:'Descargar PDF',exact:true})).toBeEnabled();
  await delivery.getByRole('button',{name:'Nueva venta',exact:true}).click();await expect(page.getByRole('button',{name:'CONSULTAR COMPROBANTE',exact:true})).toBeVisible();
  expect(s.writes).toEqual(['POST /api/v1/sales/operations','POST /api/v1/sales','POST /api/v1/billing/documents/from-sale/81']);clean(s);
});

test('P1 failed operations read is unknown and changing session closes delivery without late reopening',async({page})=>{
  const s=await setup(page);s.state.operationsError=true;s.state.allowCheckout=true;await page.goto('/pos');await purchaseB(page);
  await page.getByRole('button',{name:/^Pendientes/}).click();const panel=page.getByRole('dialog',{name:'Operaciones',exact:true});await panel.getByRole('button',{name:'Actualizar',exact:true}).click();
  await expect(panel).toContainText('No pudimos consultar las operaciones');await expect(page.locator('app-sale-operation-recovery > button')).toContainText('Sin comprobar');await capture(page,'operations-error');
  await panel.getByRole('button',{name:'Cerrar operaciones',exact:true}).click();await completeCheckout(page);const delivery=page.getByRole('dialog',{name:'Venta #81 · Registrada',exact:true});await expect(delivery).toBeVisible();
  await page.evaluate(()=>localStorage.setItem('erp_pos_token','synthetic-other-actor'));await expect(delivery).toHaveCount(0);
  expect(s.writes).toEqual(['POST /api/v1/sales/operations','POST /api/v1/sales']);clean(s);
});

const headerEvidence=path.join(os.tmpdir(),'inktoy-ux-pos-2-header-operations');
async function headerShot(page:Page,name:string){await mkdir(headerEvidence,{recursive:true});await page.screenshot({path:path.join(headerEvidence,name+'.png')});}
async function openPending(page:Page){await page.getByRole('button',{name:/^Pendientes:/}).click();return page.getByRole('dialog',{name:'Operaciones',exact:true});}
async function otherFilter(page:Page,value:string){const panel=page.getByRole('dialog',{name:'Operaciones',exact:true});

  await panel.getByLabel('Filtrar operaciones',{exact:true}).selectOption(value);return panel;}

test('H-01 compact cash header and unknown, empty, failed and positive pending preserve purchase B',async({page})=>{
  await page.setViewportSize({width:1440,height:900});const s=await setup(page);await page.goto('/pos');await purchaseB(page);const before=await draft(page);
  const header=page.locator('.pos-utility-header');await expect(header).toContainText('Caja abierta · Sesión #7');await expect(header).toContainText('Almacén de salida:');
  await expect(header).not.toContainText('Venta actual');await expect(header).not.toContainText('OPERACIÓN / POS');await headerShot(page,'after-header-dark');
  const cashReads=s.reads.filter(p=>p.includes('/cash-registers/current')).length;
  const cash=page.locator('.pos-cash-details');await cash.locator('summary').click();await expect(cash).toContainText('Apertura:');
  await expect(cash.getByRole('link',{name:'Abrir Caja',exact:true})).toHaveAttribute('href','/caja');await headerShot(page,'cash-session');
  await cash.locator('summary').press('Escape');await expect(cash).not.toHaveAttribute('open','');await expect(cash.locator('summary')).toBeFocused();
  expect(s.reads.filter(p=>p.includes('/cash-registers/current')).length).toBe(cashReads);
  const panel=await openPending(page);await expect(panel).toContainText('Aún no hemos comprobado tus pendientes');expect(s.reads.filter(p=>p.includes('/sales/operations'))).toEqual([]);
  const close=panel.getByRole('button',{name:'Cerrar operaciones',exact:true});await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');await expect(panel.getByRole('button',{name:'Actualizar',exact:true})).toBeFocused();
  await page.keyboard.press('Tab');await expect(close).toBeFocused();await headerShot(page,'pending-unverified');expect(await draft(page)).toEqual(before);
  await panel.getByRole('button',{name:'Actualizar',exact:true}).click();await expect(panel).toContainText('No se encontraron operaciones por atender');
  await expect(page.locator('.pending-count')).toHaveCount(0);await headerShot(page,'pending-empty');
  s.state.operationsError=true;await panel.getByRole('button',{name:'Actualizar',exact:true}).click();await expect(panel.getByRole('alert')).toContainText('No pudimos consultar las operaciones');
  await expect(panel).not.toContainText('Synthetic');await expect(panel).not.toContainText('No se encontraron operaciones por atender');await expect(page.locator('.pending-count')).toHaveCount(0);await headerShot(page,'pending-error');
  s.state.operationsError=false;s.state.historical='PREPARED';await panel.getByRole('button',{name:'Reintentar',exact:true}).click();
  await expect(panel.locator('.recovery-list')).toContainText('Compra preparada');await expect(page.locator('.pending-count')).toHaveText('1');await headerShot(page,'pending-prepared');
  await panel.getByRole('button',{name:'Revisar preparación',exact:true}).click();expect(await draft(page)).toEqual(before);
  await expect(panel.locator('.recovery-detail')).toHaveAttribute('data-operation-id',operationId);await expect(panel).not.toContainText('Documento #');
  expect(await panel.innerText()).not.toMatch(/COMPLETED|NOT_REQUIRED/);await expect(panel.locator('.recovery-detail details')).not.toHaveAttribute('open','');await panel.getByText('Detalles técnicos',{exact:true}).click();
  await expect(panel).toContainText('Operación: '+operationId);await headerShot(page,'pending-technical');
  await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:/^Pendientes:/})).toBeFocused();expect(await draft(page)).toEqual(before);
  await headerShot(page,'cart-B-preserved');expect(s.writes).toEqual([]);clean(s);
  await writeFile(path.join(headerEvidence,'H-01.json'),JSON.stringify({before,after:await draft(page),reads:s.reads,writes:s.writes},null,2));
});

test('H-02 resolved history navigates read-only and secondary filters keep the last attention count',async({page})=>{
  await page.setViewportSize({width:1440,height:900});const s=await setup(page);await page.goto('/pos');await purchaseB(page);const before=await draft(page);
  const panel=await openPending(page);await panel.getByRole('button',{name:'Actualizar',exact:true}).click();
  await otherFilter(page,'COMPLETED');await expect(panel.locator('.recovery-list')).toContainText('Venta #81 · Registrada');await expect(page.locator('.pending-count')).toHaveCount(0);
  await expect(panel.getByRole('button',{name:'Continuar documento',exact:true})).toHaveCount(0);
  expect(await draft(page)).toEqual(before);await headerShot(page,'historical-readonly');
  await panel.getByRole('link',{name:'Ver venta #81',exact:true}).click();await expect(page.getByRole('heading',{name:'Venta #81',exact:true})).toBeVisible();
  await page.goBack();await expect(cart(page).locator('app-pos-cart-item')).toHaveCount(2);expect(await draft(page)).toEqual(before);
  const reopened=await openPending(page);for(const value of ['PREPARED','','CANCELLED','attention']){
    await otherFilter(page,value);await expect(reopened.getByRole('button',{name:'Actualizar',exact:true})).toBeEnabled();expect(await draft(page)).toEqual(before);
  }
  expect(s.reads).toContain('/api/v1/sales/operations?page=0&size=10&state=COMPLETED');
  expect(s.reads.some(p=>p.includes('attention=true'))).toBe(true);await page.keyboard.press('Escape');expect(s.writes).toEqual([]);clean(s);
});

test('H-03 pending document, uncertain result and cancelled preparation retain their distinct actions',async({page})=>{
  const s=await setup(page);s.state.receiptState='PENDING';s.state.receiptType='INVOICE';await page.goto('/pos');await purchaseB(page);const before=await draft(page);
  const panel=await openPending(page);await panel.getByRole('button',{name:'Actualizar',exact:true}).click();
  await expect(panel).toContainText('Factura electrónica · Solicitada');await panel.getByRole('button',{name:'Continuar documento',exact:true}).click();
  await expect(panel.locator('.recovery-detail').getByRole('button',{name:'Continuar documento',exact:true})).toBeVisible();expect(await draft(page)).toEqual(before);
  await panel.getByRole('button',{name:'Volver a operaciones',exact:true}).click();s.state.historical='RESULT_UNAVAILABLE';s.state.receiptState='NOT_REQUIRED';
  await otherFilter(page,'');await expect(panel).toContainText('Todavía no sabemos si esta compra se registró');await panel.getByRole('button',{name:'Comprobar resultado',exact:true}).click();
  await expect(panel.locator('.recovery-detail')).toContainText('Venta por verificar');await headerShot(page,'pending-uncertain');
  await panel.locator('.recovery-detail').getByRole('button',{name:'Comprobar resultado',exact:true}).click();expect(await draft(page)).toEqual(before);
  await panel.getByRole('button',{name:'Volver a operaciones',exact:true}).click();s.state.historical='CANCELLED';await otherFilter(page,'CANCELLED');
  await panel.getByRole('button',{name:'Ver detalles',exact:true}).click();await expect(panel).toContainText('Preparación cancelada');
  await expect(panel.getByRole('button',{name:/Revisar preparación|Continuar documento|Confirmar cancelación/})).toHaveCount(0);
  await page.keyboard.press('Escape');expect(await draft(page)).toEqual(before);expect(s.writes).toEqual([]);clean(s);
});

for(const size of [{width:1440,height:900,theme:'light'},{width:768,height:1024,theme:'dark'},{width:390,height:844,theme:'dark'},{width:320,height:844,theme:'light'}]){
  test('H-04 responsive keyboard '+size.width+' '+size.theme,async({page})=>{
    await page.setViewportSize(size);const s=await setup(page);s.state.historical='PREPARED';
    if(size.theme==='light')await page.addInitScript(()=>localStorage.setItem('erp_pos_theme','light'));
    await page.goto('/pos');await purchaseB(page);const before=await draft(page);await page.locator('.pos-utility-header').scrollIntoViewIfNeeded();
    await expect(page.locator('body')).toHaveAttribute('data-theme',size.theme);await headerShot(page,'header-'+size.width+'-'+size.theme);
    const panel=await openPending(page);await panel.getByRole('button',{name:'Actualizar',exact:true}).click();
    const drawer=panel.locator('.operations-drawer');const bounds=await drawer.evaluate(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,scroll:el.scrollWidth,client:el.clientWidth,viewport:innerWidth};});
    expect(bounds.left).toBeGreaterThanOrEqual(0);expect(bounds.right).toBeLessThanOrEqual(size.width);expect(bounds.scroll).toBeLessThanOrEqual(bounds.client);expect(bounds.width).toBeLessThanOrEqual(520);
    const close=panel.getByRole('button',{name:'Cerrar operaciones',exact:true});await close.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');await expect(close).toBeFocused();
    const focus=await close.evaluate(el=>{const s=getComputedStyle(el);return {style:s.outlineStyle,width:parseFloat(s.outlineWidth),color:s.outlineColor};});
    expect(focus.width).toBeGreaterThanOrEqual(2);expect(focus.style).not.toBe('none');
    await page.keyboard.press('Shift+Tab');expect(await panel.evaluate(el=>el.contains(document.activeElement))).toBe(true);await page.keyboard.press('Tab');await expect(close).toBeFocused();
    await headerShot(page,'panel-'+size.width+'-'+size.theme);await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:/^Pendientes:/})).toBeFocused();
    expect(await draft(page)).toEqual(before);expect(s.writes).toEqual([]);clean(s);await writeFile(path.join(headerEvidence,'responsive-'+size.width+'.json'),JSON.stringify({bounds,focus,before,after:await draft(page)},null,2));
  });
}

test('H-05 cash closed and failed lookup never invent a session or enable checkout',async({page})=>{
  const s=await setup(page);s.state.cash='error';await page.goto('/pos');const header=page.locator('.pos-utility-header');
  await expect(header).toContainText('No se pudo verificar la caja');await expect(header).not.toContainText('Sesión #');await expect(page.getByRole('button',{name:'COBRAR',exact:true})).toBeDisabled();
  await page.locator('.pos-cash-details > summary').click();await headerShot(page,'cash-unverified');s.state.cash='closed';
  await page.getByRole('button',{name:'Reintentar caja',exact:true}).click();await expect(header.locator('[data-state]')).toHaveText('Caja cerrada');await expect(header).not.toContainText('Sesión #');
  await expect(header.getByRole('link',{name:'Abrir Caja',exact:true})).toHaveAttribute('href','/caja');expect(s.writes).toEqual([]);clean(s);
});

const finalOperationsEvidence=path.join(os.tmpdir(),'inktoy-ux-pos-2-operations-final');
async function operationShot(page:Page,testName:string,state:string){
  await mkdir(finalOperationsEvidence,{recursive:true});const file=testName+'-'+state+'.png';await page.screenshot({path:path.join(finalOperationsEvidence,file)});
  const index=path.join(finalOperationsEvidence,'screenshots.json');let rows:any[]=[];try{rows=JSON.parse(await readFile(index,'utf8'));}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
  await writeFile(index,JSON.stringify([...rows.filter(row=>row.file!==file),{test:testName,state,file,viewport:page.viewportSize(),theme:await page.locator('body').getAttribute('data-theme')}],null,2));
}
async function operationsAudit(page:Page,s:Awaited<ReturnType<typeof setup>>,name:string,before:Awaited<ReturnType<typeof draft>>,expectedDocumentReads:string[]=[]){
  const after=await draft(page);expect(after).toEqual(before);expect(s.writes).toEqual([]);clean(s);
  expect(s.reads.filter(p=>p.includes('/billing/documents'))).toEqual(expectedDocumentReads);
  await writeFile(path.join(finalOperationsEvidence,name+'.json'),JSON.stringify({before,after,reads:s.reads,writes:s.writes},null,2));
}

test('N-01 one direct filter, contextual empty states, query errors and attention reset',async({page})=>{
  await page.setViewportSize({width:1440,height:900});const s=await setup(page);s.state.operationsEmpty=true;
  await page.addInitScript(()=>localStorage.setItem('erp_pos_theme','light'));await page.goto('/pos');await purchaseB(page);const before=await draft(page);
  const panel=await openPending(page);await expect(panel.getByRole('heading',{name:'Operaciones',exact:true})).toBeVisible();
  await expect(panel.getByLabel('Filtrar operaciones',{exact:true})).toHaveValue('attention');await expect(panel.getByRole('combobox')).toHaveCount(1);
  await expect(panel).not.toContainText('Consultar otras operaciones');await expect(panel).not.toContainText('Filtro:');await expect(panel).toContainText('Aún no hemos comprobado tus pendientes');
  await expect(page.locator('.pending-count')).toHaveCount(0);await operationShot(page,'N-01','por-atender-sin-verificar');
  await panel.getByRole('button',{name:'Actualizar',exact:true}).click();await expect(panel).toContainText('No se encontraron operaciones por atender');await operationShot(page,'N-01','por-atender-vacio');
  for(const [filter,message] of [['','No se encontraron operaciones recientes'],['PREPARED','No se encontraron compras preparadas'],['COMPLETED','No se encontraron operaciones registradas'],['CANCELLED','No se encontraron operaciones canceladas']]){
    await panel.getByLabel('Filtrar operaciones',{exact:true}).selectOption(filter);await expect(panel).toContainText(message);await expect(panel.locator('.query-caption')).toHaveCount(0);expect(await draft(page)).toEqual(before);
    await operationShot(page,'N-01','vacio-'+(filter||'recientes'));
  }
  s.state.operationsError=true;await panel.getByRole('button',{name:'Actualizar',exact:true}).click();await expect(panel.getByRole('alert')).toContainText('No pudimos consultar las operaciones');
  await expect(panel).not.toContainText('No se encontraron');await expect(page.locator('.pending-count')).toHaveCount(0);await operationShot(page,'N-01','error');
  s.state.operationsError=false;await panel.getByRole('button',{name:'Reintentar',exact:true}).click();await expect(panel).toContainText('No se encontraron operaciones canceladas');
  await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:/^Pendientes:/})).toBeFocused();
  await openPending(page);await expect(panel.getByLabel('Filtrar operaciones',{exact:true})).toHaveValue('attention');await page.keyboard.press('Escape');await operationsAudit(page,s,'N-01',before);
});

test('N-02 list classifies note and requested electronic documents without N+1 or document output',async({page})=>{
  await page.setViewportSize({width:1440,height:900});const s=await setup(page);await page.goto('/pos');await purchaseB(page);const before=await draft(page);
  const panel=await openPending(page);await panel.getByLabel('Filtrar operaciones',{exact:true}).selectOption('');
  const row=panel.locator('.recovery-list li');await expect(row).toContainText('Nota de venta · No fiscal');await expect(row.getByRole('link',{name:'Ver venta #81',exact:true})).toBeVisible();
  await expect(row.getByRole('button')).toHaveCount(0);expect(await row.innerText()).not.toMatch(/TICKET|NOT_REQUIRED|Sin solicitud|Sin comprobante|emitida|PDF disponible/);await operationShot(page,'N-02','recientes-nota-de-venta');
  for(const [type,label] of [['RECEIPT','Boleta electrónica'],['INVOICE','Factura electrónica']]){
    s.state.receiptType=type;s.state.receiptState='PENDING';await panel.getByRole('button',{name:'Actualizar',exact:true}).click();
    await expect(row).toContainText(label+' · Solicitada');await expect(row).toContainText('Venta #81 · Registrada');await expect(row.getByRole('button',{name:'Continuar documento',exact:true})).toBeVisible();
    await operationShot(page,'N-02',type.toLowerCase()+'-solicitada');
  }
  expect(s.reads.filter(p=>p.includes('/sales/operations/'))).toEqual([]);expect(s.reads.filter(p=>p.includes('/sales/operations?')).length).toBe(3);
  await page.keyboard.press('Escape');await operationsAudit(page,s,'N-02',before);
});

test('N-03 recorded document statuses retain the missing-environment qualification',async({page})=>{
  const s=await setup(page);s.state.receiptType='INVOICE';s.state.receiptState='LOCATED';s.state.operationDocumentId=901;s.state.operationDocumentStatus='GENERATED';
  await page.goto('/pos');await purchaseB(page);const before=await draft(page);const panel=await openPending(page);await panel.getByLabel('Filtrar operaciones',{exact:true}).selectOption('COMPLETED');
  const row=panel.locator('.recovery-list li');await expect(row).toContainText('Factura electrónica · Generada · Ambiente no verificado');await operationShot(page,'N-03','generada-ambiente-no-verificado');
  for(const [status,label] of [['SENT','Enviada'],['ACCEPTED','Aceptación registrada; validez fiscal no verificada'],['REJECTED','Rechazada']]){
    s.state.operationDocumentStatus=status;await panel.getByRole('button',{name:'Actualizar',exact:true}).click();await expect(row).toContainText(label+' · Ambiente no verificado');
    await expect(row.getByRole('button')).toHaveCount(0);await expect(row.getByRole('link',{name:'Ver venta #81',exact:true})).toBeVisible();await expect(panel).not.toContainText('SUNAT');
    await operationShot(page,'N-03',status.toLowerCase());
  }
  s.state.receiptType=null;await panel.getByRole('button',{name:'Actualizar',exact:true}).click();await expect(row).toContainText('Documento no verificado');await expect(row).not.toContainText('Nota de venta');
  await page.keyboard.press('Escape');await operationsAudit(page,s,'N-03',before);
});

test('N-04 completed history has only direct read-only navigation and preserves purchase B',async({page})=>{
  await page.setViewportSize({width:1440,height:900});const s=await setup(page);await page.goto('/pos');await purchaseB(page);const before=await draft(page);
  const panel=await openPending(page);await panel.getByLabel('Filtrar operaciones',{exact:true}).selectOption('COMPLETED');
  await expect(panel.locator('.recovery-list li')).toContainText('Nota de venta');await expect(panel.locator('.recovery-list button')).toHaveCount(0);
  await expect(panel).not.toContainText('Detalles técnicos');await expect(panel).not.toContainText('Conserva esta compra en su caja');await operationShot(page,'N-04','historica-acceso-directo');
  expect(s.reads.filter(p=>p.includes('/billing/documents'))).toEqual([]);
  await panel.getByRole('link',{name:'Ver venta #81',exact:true}).click();await expect(page.getByRole('heading',{name:'Venta #81',exact:true})).toBeVisible();
  await page.goBack();await expect(cart(page).locator('app-pos-cart-item')).toHaveCount(2);expect(s.reads.filter(p=>p.includes('/sales/operations/'))).toEqual([]);
  await operationShot(page,'N-04','carrito-B-preservado');await operationsAudit(page,s,'N-04',before,['/api/v1/billing/documents?saleId=81']);
});

test('N-05 denied operation document metadata is an error, never absence or authorization bypass',async({page})=>{
  const s=await setup(page);s.state.receiptType='INVOICE';s.state.receiptState='PENDING';s.state.operationDetailError=true;
  await page.goto('/pos');await purchaseB(page);const before=await draft(page);const panel=await openPending(page);await panel.getByRole('button',{name:'Actualizar',exact:true}).click();
  await panel.getByRole('button',{name:'Continuar documento',exact:true}).click();await expect(panel.getByRole('alert')).toContainText('No pudimos consultar las operaciones');
  await expect(panel).not.toContainText('Nota de venta');await expect(panel).not.toContainText('No se encontraron');await expect(page.locator('.pending-count')).toHaveCount(0);await operationShot(page,'N-05','lectura-metadatos-denegada');
  s.state.operationDetailError=false;await panel.getByRole('button',{name:'Reintentar',exact:true}).click();await expect(panel).toContainText('Factura electrónica · Solicitada');
  await page.keyboard.press('Escape');await operationsAudit(page,s,'N-05',before);
});

test('N-06 uncertain result is a GET on the same identity and keeps the editable purchase',async({page})=>{
  const s=await setup(page);s.state.historical='RESULT_UNAVAILABLE';await page.goto('/pos');await purchaseB(page);const before=await draft(page);
  const panel=await openPending(page);await panel.getByLabel('Filtrar operaciones',{exact:true}).selectOption('');await panel.getByRole('button',{name:'Comprobar resultado',exact:true}).click();
  await expect(panel.locator('.recovery-detail')).toHaveAttribute('data-operation-id',operationId);await expect(panel).toContainText('no repitas el cobro');
  await panel.getByRole('button',{name:'Comprobar resultado',exact:true}).click();await expect.poll(()=>s.reads.filter(p=>p.endsWith('/sales/operations/'+operationId)).length).toBe(2);await expect(panel.locator('.recovery-detail')).toHaveAttribute('data-operation-id',operationId);
  await page.keyboard.press('Escape');await operationsAudit(page,s,'N-06',before);
});

for(const viewport of [{width:390,height:844,theme:'dark'},{width:320,height:844,theme:'light'}])test('N-07 direct selector and keyboard at '+viewport.width+' '+viewport.theme,async({page})=>{
  await page.setViewportSize(viewport);const s=await setup(page);s.state.historical='PREPARED';await page.addInitScript(theme=>localStorage.setItem('erp_pos_theme',theme),viewport.theme);
  await page.goto('/pos');await purchaseB(page);const before=await draft(page);const panel=await openPending(page);const close=panel.getByRole('button',{name:'Cerrar operaciones',exact:true});
  await expect(close).toBeFocused();await page.keyboard.press('Shift+Tab');await expect(panel.getByRole('button',{name:'Actualizar',exact:true})).toBeFocused();await page.keyboard.press('Tab');await expect(close).toBeFocused();
  await panel.getByRole('button',{name:'Actualizar',exact:true}).click();await expect(panel).toContainText('Compra preparada');
  const bounds=await panel.locator('.operations-drawer').evaluate(el=>({width:el.getBoundingClientRect().width,scroll:el.scrollWidth,client:el.clientWidth}));expect(bounds.width).toBe(viewport.width);expect(bounds.scroll).toBeLessThanOrEqual(bounds.client);
  const select=panel.getByLabel('Filtrar operaciones',{exact:true});await close.focus();await page.keyboard.press('Tab');await expect(select).toBeFocused();
  const geometry=await select.evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {left:r.left,right:r.right,outline:s.outlineStyle,width:parseFloat(s.outlineWidth)};});
  expect(geometry.left).toBeGreaterThanOrEqual(0);expect(geometry.right).toBeLessThanOrEqual(viewport.width);expect(geometry.outline).toBe('solid');expect(geometry.width).toBeGreaterThanOrEqual(2);
  await operationShot(page,'N-07-'+viewport.width,'selector-y-preparada');await panel.getByRole('button',{name:'Revisar preparación',exact:true}).click();
  await expect(panel).toContainText('Conserva esta compra en su caja y almacén originales');expect(await draft(page)).toEqual(before);await operationShot(page,'N-07-'+viewport.width,'recuperacion-PREPARED');
  await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:/^Pendientes:/})).toBeFocused();await operationsAudit(page,s,'N-07-'+viewport.width,before);
});

test('N-08 a late list response after closing cannot repopulate or alter purchase B',async({page})=>{
  const s=await setup(page);await page.goto('/pos');await purchaseB(page);const before=await draft(page);let release!:()=>void,entered!:()=>void,finished!:()=>void;
  const gate=new Promise<void>(r=>release=r),started=new Promise<void>(r=>entered=r),done=new Promise<void>(r=>finished=r);
  await page.route('**/api/v1/sales/operations?**',async route=>{entered();await gate;try{await route.fallback();}finally{finished();}});
  const panel=await openPending(page);await panel.getByRole('button',{name:'Actualizar',exact:true}).click();await started;await page.keyboard.press('Escape');release();await done;
  await expect(page.getByRole('dialog',{name:'Operaciones',exact:true})).toHaveCount(0);await expect(page.locator('.pending-count')).toHaveCount(0);
  await operationsAudit(page,s,'N-08',before);
});

for(const viewport of [{width:1440,height:900,theme:'dark'},{width:390,height:844,theme:'dark'},{width:320,height:844,theme:'light'}])test('SP-01 operations controls separate every content state '+viewport.width,async({page})=>{
  await page.setViewportSize(viewport);const s=await setup(page);s.state.operationsEmpty=true;await page.addInitScript(theme=>localStorage.setItem('erp_pos_theme',theme),viewport.theme);
  await page.goto('/pos');await purchaseB(page);const before=await draft(page);const panel=await openPending(page);
  const evidence=path.join(os.tmpdir(),'inktoy-ux-pos-2-operations-spacing');const measurements:any[]=[];
  const measure=async(state:string)=>{
    await expect(panel.locator('.recovery')).toHaveAttribute('aria-busy','false');
    const geometry=await panel.locator('.recovery').evaluate(el=>{
      const controls=el.querySelector<HTMLElement>('.filter-heading')!,r=controls.getBoundingClientRect();
      const content=Array.from(el.children).filter(child=>child!==controls).find(child=>{const c=child.getBoundingClientRect();return c.height>0&&c.top>=r.bottom;})!;
      const c=content.getBoundingClientRect(),drawer=el.closest('.operations-drawer')!;
      return {gap:c.top-r.bottom,controlsBottom:r.bottom,contentTop:c.top,margin:parseFloat(getComputedStyle(controls).marginBottom),scroll:drawer.scrollWidth,client:drawer.clientWidth};
    });
    expect(geometry.margin).toBe(16);expect(geometry.gap).toBeGreaterThanOrEqual(16);expect(geometry.scroll).toBeLessThanOrEqual(geometry.client);
    await expect(panel.getByLabel('Filtrar operaciones',{exact:true}).locator('option')).toHaveText(['Por atender','Recientes','Preparadas','Registradas/completadas','Canceladas']);
    expect(await draft(page)).toEqual(before);measurements.push({state,...geometry});
    return geometry;
  };
  await expect(panel).toContainText('Aún no hemos comprobado tus pendientes');await measure('informativo');
  const filter=panel.getByLabel('Filtrar operaciones',{exact:true});await filter.selectOption('PREPARED');await expect(panel).toContainText('No se encontraron compras preparadas');
  await measure('preparadas-vacio');await page.screenshot({path:path.join(evidence,'after-prepared-'+viewport.width+'.png')});
  await filter.selectOption('attention');await expect(panel).toContainText('No se encontraron operaciones por atender');await measure('por-atender-vacio');
  s.state.operationsEmpty=false;await filter.selectOption('');await expect(panel.locator('.recovery-list li')).toContainText('Nota de venta');await measure('recientes-lista');
  if(viewport.width===1440)await page.screenshot({path:path.join(evidence,'after-recientes.png')});
  await filter.selectOption('COMPLETED');await expect(panel.getByRole('link',{name:'Ver venta #81',exact:true})).toBeVisible();await measure('registradas-lista');
  if(viewport.width===1440)await page.screenshot({path:path.join(evidence,'after-registradas.png')});
  s.state.historical='PREPARED';await filter.selectOption('PREPARED');await expect(panel.getByRole('button',{name:'Revisar preparación',exact:true})).toBeVisible();await measure('preparadas-lista');
  s.state.operationsError=true;await panel.getByRole('button',{name:'Actualizar',exact:true}).click();await expect(panel.getByRole('alert')).toContainText('No pudimos consultar las operaciones');await measure('error');
  await page.keyboard.press('Escape');expect(await draft(page)).toEqual(before);expect(s.writes).toEqual([]);clean(s);
  await writeFile(path.join(evidence,'after-'+viewport.width+'.json'),JSON.stringify({viewport,measurements,before,after:await draft(page),reads:s.reads,writes:s.writes},null,2));
});

const checkoutEvidence=path.join(os.tmpdir(),'inktoy-ux-pos-2-checkout-visual');
async function checkoutShot(page:Page,name:string,scenario:string){
  await mkdir(path.join(checkoutEvidence,'after-images'),{recursive:true});const file='after-images/'+name+'.png';await page.screenshot({path:path.join(checkoutEvidence,file)});
  const before='before-images/'+name+'.png';let comparison:string|null=null;try{await access(path.join(checkoutEvidence,before));comparison=before;}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
  const target=path.join(checkoutEvidence,'screenshots.json');let rows:any[]=[];try{rows=JSON.parse(await readFile(target,'utf8'));}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
  await writeFile(target,JSON.stringify([...rows.filter(row=>row.file!==file),{scenario,result:'PASS',file,before:comparison,viewport:page.viewportSize(),theme:await page.locator('body').getAttribute('data-theme')}],null,2));
}
async function cOpen(page:Page){await page.getByRole('button',{name:'COBRAR',exact:true}).click();return page.getByRole('dialog',{name:'Cobrar venta',exact:true});}
async function cBounds(locator:ReturnType<Page['locator']>,width:number){const box=await locator.evaluate(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,viewport:innerHeight,scroll:el.scrollWidth,client:el.clientWidth};});
  expect(box.left).toBeGreaterThanOrEqual(0);expect(box.right).toBeLessThanOrEqual(width);expect(box.top).toBeGreaterThanOrEqual(0);expect(box.bottom).toBeLessThanOrEqual(box.viewport);expect(box.scroll).toBeLessThanOrEqual(box.client);return box;}
const checkoutViewports=[{width:1440,height:900,theme:'dark'},{width:768,height:1024,theme:'light'},{width:390,height:844,theme:'dark'},{width:320,height:844,theme:'light'}];

for(const viewport of checkoutViewports){
 test('C-01 compact full cart, identifiers, decimal editing and scroll '+viewport.width,async({page})=>{
  await page.setViewportSize(viewport);const s=await setup(page);s.state.manyProducts=true;await page.addInitScript(t=>localStorage.setItem('erp_pos_theme',t),viewport.theme);await page.goto('/pos');
  const search=page.getByLabel('Buscar producto por nombre, SKU o código',{exact:true});await search.fill('sintético');await search.press('Enter');const adds=page.locator('app-pos-search-results').getByRole('button',{name:'Agregar',exact:true});for(let i=0;i<12;i++)await adds.nth(i).click();
  const launcher=page.getByRole('button',{name:'Ver carrito completo',exact:true});await launcher.click();const modal=page.getByRole('dialog',{name:'Carrito completo',exact:true});await expect(modal.locator('.full-cart-row')).toHaveCount(12);await cBounds(modal.locator('.full-cart-modal'),viewport.width);
  await expect(modal).not.toContainText('Sin código');const duplicate=modal.locator('.full-cart-row').filter({hasText:'Producto sintético 4'});expect((await duplicate.locator('.full-cart-product-meta-row').innerText()).match(/SYN-4/g)?.length).toBe(1);
  const quantity=modal.getByLabel('Cantidad del producto',{exact:true}).nth(1);await quantity.fill('1.25');await expect(quantity).toBeFocused();await expect(quantity).toHaveValue('1.25');
  await modal.getByLabel('Descuento del producto',{exact:true}).first().fill('1');await expect(modal.getByLabel('Descuento del producto',{exact:true}).first()).toBeFocused();
  await modal.locator('.full-cart-list').evaluate(el=>el.scrollTop=0);await checkoutShot(page,'cart-'+viewport.width,'C-01 carrito de 12 productos y edición decimal');
  const list=modal.locator('.full-cart-list');expect(await list.evaluate(el=>el.scrollHeight>el.clientHeight)).toBe(true);await list.evaluate(el=>el.scrollTop=el.scrollHeight);await expect(modal.getByRole('button',{name:'Cerrar',exact:true})).toBeVisible();await expect(modal.locator('.full-cart-summary')).toBeVisible();await checkoutShot(page,'cart-scroll-'+viewport.width,'C-01 scroll interno con cierre y total accesibles');
  const before=await draft(page);await page.keyboard.press('Escape');await expect(launcher).toBeFocused();expect(await draft(page)).toEqual(before);expect(s.writes).toEqual([]);clean(s);
  await writeFile(path.join(checkoutEvidence,'C-01-'+viewport.width+'.json'),JSON.stringify({before,after:await draft(page),writes:s.writes},null,2));
 });
 test('C-02 integrated checkout, documents, validations and safe close '+viewport.width,async({page})=>{
  await page.setViewportSize(viewport);const s=await setup(page);await page.addInitScript(t=>localStorage.setItem('erp_pos_theme',t),viewport.theme);await page.goto('/pos');await purchaseB(page);const c=await cOpen(page),action=c.getByRole('button',{name:'Confirmar venta',exact:true});
  await expect(c.getByRole('button',{name:'Nota de venta No fiscal',exact:true})).toHaveAttribute('aria-pressed','true');await expect(action).toBeEnabled();await expect(c.locator('app-pos-totals-summary')).toHaveCount(0);await expect(c.locator('.payment-total')).toHaveCount(1);await cBounds(c.locator('.checkout-modal'),viewport.width);await checkoutShot(page,'note-'+viewport.width,'C-02 nota de venta y revisión integrada');
  await c.getByRole('button',{name:'Boleta electrónica',exact:true}).click();await expect(c.getByLabel(/^Serie de comprobante/)).toHaveValue('22');await c.getByLabel(/^Serie de comprobante/).selectOption('');await expect(action).toBeDisabled();await c.getByLabel(/^Serie de comprobante/).selectOption('22');await c.getByLabel(/^Documento \(DNI\)/).fill('12');await c.getByLabel(/^Documento \(DNI\)/).press('Tab');await expect(action).toBeDisabled();await expect(c).toContainText('El DNI debe tener exactamente 8 dígitos.');await c.getByLabel(/^Documento \(DNI\)/).fill('12345678');await expect(action).toBeEnabled();await checkoutShot(page,'receipt-'+viewport.width,'C-02 boleta solicitada sin escritura');
  await c.getByRole('button',{name:'Factura electrónica',exact:true}).click();await expect(action).toBeDisabled();await checkoutShot(page,'invoice-invalid-'+viewport.width,'C-02 factura incompleta bloqueada con motivo');
  await c.getByLabel(/^Serie de comprobante/).selectOption('21');await c.getByLabel(/^RUC/).fill('20123456789');await c.getByLabel(/^Razón social/).fill('Cliente sintético');await c.getByRole('button',{name:'Mostrar datos fiscales adicionales',exact:true}).click();await c.getByLabel('Dirección fiscal',{exact:true}).fill('Dirección sintética');await c.getByLabel('Dirección fiscal',{exact:true}).scrollIntoViewIfNeeded();await expect(action).toBeEnabled();await cBounds(c.locator('.checkout-modal'),viewport.width);expect(await c.locator('.checkout-modal__body').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);await checkoutShot(page,'invoice-'+viewport.width,'C-02 factura con datos adicionales y pagos');
  await expect(page.getByRole('dialog',{name:'Confirmar venta',exact:true})).toHaveCount(0);const before=await draft(page);await c.getByRole('button',{name:'Seguir editando',exact:true}).click();await cOpen(page);await expect(c.getByLabel('Dirección fiscal',{exact:true})).toHaveValue('Dirección sintética');expect(await draft(page)).toEqual(before);await c.getByRole('button',{name:'Cerrar',exact:true}).click();expect(await draft(page)).toEqual(before);expect(s.writes).toEqual([]);clean(s);
 });
}

test('C-03 payment validity, single confirmation, blocked processing and optional note output',async({page})=>{
 await page.setViewportSize({width:1440,height:900});const s=await setup(page);s.state.allowCheckout=true;s.state.noteError=true;await page.goto('/pos');await purchaseB(page);const c=await cOpen(page),action=c.getByRole('button',{name:'Confirmar venta',exact:true});
 await c.getByLabel('Monto *',{exact:true}).nth(1).fill('0');for(const [amount,name] of [['0','payment-zero'],['10','payment-insufficient'],['14.13','payment-exact'],['20','payment-change']]){
  await c.getByLabel('Monto *',{exact:true}).first().fill(amount);if(Number(amount)<14.13){await expect(action).toBeDisabled();await expect(c.locator('.checkout-block-reason')).toContainText(/pago|pagado/);}else await expect(action).toBeEnabled();
  if(amount==='20')await expect(c.locator('.payment-panel__metrics')).toContainText(/Vuelto\s*S\/\s*5\.87/);await checkoutShot(page,name,'C-03 '+name+(amount==='14.13'?' y confirmación integrada':''));
 }
 await c.getByRole('combobox',{name:'Método *',exact:true}).first().selectOption('CARD');await expect(action).toBeDisabled();await expect(c.locator('.checkout-block-reason')).toContainText('pagos electrónicos');await c.getByRole('combobox',{name:'Método *',exact:true}).first().selectOption('CASH');await expect(action).toBeEnabled();expect(s.writes).toEqual([]);
 let release!:()=>void,started!:()=>void;const gate=new Promise<void>(r=>release=r),entered=new Promise<void>(r=>started=r);const requests:string[]=[];page.on('request',r=>{if(r.method()==='POST')requests.push(new URL(r.url()).pathname);});
 await page.route('**/api/v1/sales',async route=>{if(route.request().method()!=='POST')return route.fallback();started();await gate;return route.fallback();});await action.dblclick();await entered;await expect(c.locator('.checkout-modal__action--primary')).toBeDisabled();await expect(c.locator('.checkout-modal__action--primary')).toHaveText('Procesando…');await expect(c.locator('fieldset')).toHaveJSProperty('disabled',true);await expect(c.getByLabel('Monto *',{exact:true}).first()).toBeDisabled();await expect(c.getByRole('button',{name:'Nota de venta No fiscal',exact:true})).toBeDisabled();await expect(page.getByRole('dialog',{name:'Confirmar venta',exact:true})).toHaveCount(0);await checkoutShot(page,'processing','C-03 procesamiento bloqueado después de una única decisión');release();
 const delivery=page.getByRole('dialog',{name:'Venta #81 · Registrada',exact:true});await expect(delivery).toBeVisible();await expect(delivery).toContainText(/Total confirmado: S\/\s*14\.13/);await expect(delivery.getByRole('button',{name:'Reintentar nota',exact:true})).toBeVisible();await expect(delivery.getByRole('button',{name:'Imprimir',exact:true})).toBeDisabled();await checkoutShot(page,'note-error','C-03 fallo de lectura de nota sin alterar la venta');
 s.state.noteError=false;await delivery.getByRole('button',{name:'Reintentar nota',exact:true}).click();await expect(delivery.getByRole('button',{name:'Descargar PDF',exact:true})).toBeEnabled();await expect(delivery).toContainText('Nota de venta · No fiscal');await expect(delivery.locator('.electronic-state')).toHaveCount(0);await checkoutShot(page,'post-sale-note','C-03 posventa persistida con nota opcional');
 for(const format of ['a4','ticket58','ticket80']){await delivery.getByLabel('Formato de nota',{exact:true}).selectOption(format);await expect(delivery.getByRole('button',{name:'Descargar PDF',exact:true})).toBeEnabled();}
 const downloadPromise=page.waitForEvent('download');await delivery.getByRole('button',{name:'Descargar PDF',exact:true}).click();const download=await downloadPromise;expect(download.suggestedFilename()).toMatch(/\.pdf$/);await download.saveAs(path.join(checkoutEvidence,'synthetic-ticket80.pdf'));
 await page.evaluate(()=>window.open=()=>null);await delivery.getByRole('button',{name:'Imprimir',exact:true}).click();await expect(delivery).toContainText('Ventana bloqueada');await checkoutShot(page,'print-blocked','C-03 impresión bloqueada, venta conservada');
 const writes=[...s.writes];await delivery.getByRole('button',{name:'Nueva venta',exact:true}).click();await purchaseB(page);const before=await draft(page);await page.reload();await expect(cart(page).locator('app-pos-cart-item')).toHaveCount(2);expect(await draft(page)).toEqual(before);await expect(page.locator('app-pos-sale-note [role="dialog"]')).toHaveCount(0);expect(s.writes).toEqual(writes);expect(requests).toEqual(['/api/v1/sales/operations','/api/v1/sales']);clean(s);
 await writeFile(path.join(checkoutEvidence,'C-03.json'),JSON.stringify({requests,writes:s.writes,posteriorPurchase:before,afterRefresh:await draft(page)},null,2));
});

for(const type of ['RECEIPT','INVOICE'])test('C-04 electronic intent '+type+' remains separate from the confirmed sale',async({page})=>{
 await page.setViewportSize({width:1440,height:900});const s=await setup(page);s.state.allowCheckout=true;s.state.electronic=true;s.state.creationLost=true;s.state.document='pending';await page.goto('/pos');await purchaseB(page);const c=await cOpen(page);
 await c.getByRole('button',{name:type==='RECEIPT'?'Boleta electrónica':'Factura electrónica',exact:true}).click();await c.getByLabel(/^Serie de comprobante/).selectOption(type==='RECEIPT'?'22':'21');if(type==='INVOICE'){await c.getByLabel(/^RUC/).fill('20123456789');await c.getByLabel(/^Razón social/).fill('Cliente sintético');}
 await c.getByRole('button',{name:'Confirmar venta',exact:true}).click();const delivery=page.getByRole('dialog',{name:'Venta #81 · Registrada',exact:true});await expect(delivery).toBeVisible();await expect(delivery).toContainText(type==='RECEIPT'?'Boleta electrónica':'Factura electrónica');await delivery.getByRole('button',{name:'Actualizar estado documental',exact:true}).click();await expect(delivery).toContainText('documento pendiente');await checkoutShot(page,type==='INVOICE'?'post-sale-electronic-pending':'post-sale-receipt-pending','C-04 '+type+' solicitado, venta confirmada, documento pendiente');
 const writes=[...s.writes];s.state.document='error';await delivery.getByRole('button',{name:'Actualizar estado documental',exact:true}).click();await expect(delivery).toContainText('no pudo verificarse');if(type==='INVOICE')await checkoutShot(page,'document-read-error','C-04 error documental con resultado comercial intacto');s.state.document='REJECTED';await delivery.getByRole('button',{name:'Actualizar estado documental',exact:true}).click();await expect(delivery).toContainText('Rechazado · Beta · pruebas');await expect(delivery).not.toContainText('CDR');expect(s.writes).toEqual(writes);expect(writes).toEqual(['POST /api/v1/sales/operations','POST /api/v1/sales','POST /api/v1/billing/documents/from-sale/81']);clean(s);
});

test('C-05 uncertain result keeps its UUID through refresh and only recovers by GET',async({page})=>{
 await page.setViewportSize({width:1440,height:900});const s=await setup(page);s.state.allowCheckout=true;s.state.checkoutLost=true;await page.goto('/pos');await purchaseB(page);await completeCheckout(page);const c=page.getByRole('dialog',{name:'Cobrar venta',exact:true});await expect(c.getByRole('alert')).toBeVisible();await checkoutShot(page,'uncertain','C-05 resultado incierto, sin segunda venta');const before=await draft(page);expect(before.pending).not.toBeNull();await page.reload();await expect(cart(page).locator('app-pos-cart-item')).toHaveCount(2);expect(await draft(page)).toEqual(before);await page.getByRole('button',{name:'COMPROBAR RESULTADO',exact:true}).click();await expect(page.getByRole('button',{name:'FINALIZAR RECUPERACIÓN',exact:true})).toBeVisible();await checkoutShot(page,'recovery','C-05 mismo resultado recuperado sin repetir checkout');expect(s.writes).toEqual(['POST /api/v1/sales/operations','POST /api/v1/sales']);clean(s);
});

test('C-06 closing delivery while PDF is late never reopens it or clears the next purchase',async({page})=>{
 const s=await setup(page);s.state.allowCheckout=true;let release!:()=>void,started!:()=>void;const gate=new Promise<void>(r=>release=r),entered=new Promise<void>(r=>started=r);
 await page.route('**/api/v1/sales/81',async route=>{started();await gate;await route.fallback();});await page.goto('/pos');await purchaseB(page);await completeCheckout(page);await entered;const delivery=page.getByRole('dialog',{name:'Venta #81 · Registrada',exact:true});await delivery.getByRole('button',{name:'Cerrar entrega de nota',exact:true}).click();await purchaseB(page);const before=await draft(page);const response=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/sales/81'));release();await (await response).finished();await page.waitForLoadState('networkidle');await expect(page.locator('app-pos-sale-note [role="dialog"]')).toHaveCount(0);expect(await draft(page)).toEqual(before);expect(s.writes).toEqual(['POST /api/v1/sales/operations','POST /api/v1/sales']);clean(s);
});

for(const viewport of checkoutViewports.filter(v=>v.width!==1440))test('C-07 responsive post-sale note, formats and safe dismissal '+viewport.width,async({page})=>{
 await page.setViewportSize(viewport);const s=await setup(page);s.state.allowCheckout=true;await page.addInitScript(t=>localStorage.setItem('erp_pos_theme',t),viewport.theme);await page.goto('/pos');await purchaseB(page);await completeCheckout(page);
 const delivery=page.getByRole('dialog',{name:'Venta #81 · Registrada',exact:true});await expect(delivery.getByRole('button',{name:'Descargar PDF',exact:true})).toBeEnabled();await cBounds(delivery.locator('.delivery-card'),viewport.width);await expect(delivery.getByLabel('Formato de nota',{exact:true}).locator('option')).toHaveText(['A4','Ticket 58 mm','Ticket 80 mm']);
 const close=delivery.getByRole('button',{name:'Cerrar entrega de nota',exact:true}),next=delivery.getByRole('button',{name:'Nueva venta',exact:true});await close.focus();await page.keyboard.press('Shift+Tab');await expect(next).toBeFocused();await page.keyboard.press('Tab');await expect(close).toBeFocused();await checkoutShot(page,'post-sale-note-'+viewport.width,'C-07 posventa accesible sin recortes');
 await page.keyboard.press('Escape');await expect(delivery).toHaveCount(0);await purchaseB(page);const before=await draft(page);await expect(page.locator('app-pos-sale-note [role="dialog"]')).toHaveCount(0);expect(await draft(page)).toEqual(before);expect(s.writes).toEqual(['POST /api/v1/sales/operations','POST /api/v1/sales']);clean(s);
});
