import {test,expect,Page} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';import os from 'node:os';
const qa=path.join(os.tmpdir(),'inktoy-ux-pos-2-transient-fix'),visual=path.join(qa,'visual');
const product={productId:101,sku:'SYN-RV',name:'Cuaderno sintético',barcode:null,salePrice:10,stockAvailable:54,quantityPolicy:'WHOLE'};
const other={...product,productId:102,sku:'SYN-LAP',name:'Lápices sintéticos',salePrice:2.5,quantityPolicy:'DECIMAL_2'};
const operationId='00000000-0000-4000-8000-000000000081';
async function setup(page:Page,mode='same',theme='dark'){
 const state={mode,hold:false,checkout:false,actor:'qa-rv',cash:7,snapshots:0,pending:false};const writes:string[]=[],unexpected:string[]=[],errors:string[]=[];
 const gates:Array<{release:(mode:string)=>void}>=[];let command:any=null;
 const draft={formatVersion:2,userId:'qa-rv',cashRegisterSessionId:7,warehouseId:1,lastWarehouseId:1,code:'',query:'',searchResults:[product,other],cart:[{...product,quantity:2,discountAmount:1}],payments:[{paymentMethod:'CASH',amount:10,reference:'SYN cash'},{paymentMethod:'CARD',amount:9,reference:'SYN card'}],lastSaleId:null};
 await page.addInitScript(({draft,theme})=>{if(!localStorage.getItem('erp_pos_token'))localStorage.setItem('erp_pos_token','synthetic-rv');localStorage.setItem('erp_pos_theme',theme);if(!sessionStorage.getItem('erp_pos_sales_draft_v1'))sessionStorage.setItem('erp_pos_sales_draft_v1',JSON.stringify(draft));},{draft,theme});
 page.on('pageerror',e=>errors.push(e.message));
 await page.context().route('**/api/**',async route=>{
  const req=route.request(),u=new URL(req.url()),p=u.pathname;expect(req.headers()['authorization']).toMatch(/^Bearer synthetic-/);
  if(req.method()!=='GET'){
   writes.push(req.method()+' '+p);if(!state.checkout){unexpected.push(req.method()+' '+p);return route.abort();}
   if(p.endsWith('/sales/operations')){command=req.postDataJSON().command;expect(command.items).toEqual([{productId:101,quantity:2,discountAmount:1,confirmedUnitPrice:10}]);expect(command.confirmedTotal).toBe(19);return route.fulfill({json:{...req.postDataJSON(),state:'PREPARED',cashRegisterSessionId:7,saleId:null,receiptState:'NOT_REQUIRED'}});}
   if(p.endsWith('/sales')){expect(req.postDataJSON()).toEqual(command);return route.fulfill({status:201,json:{id:81,saleNumber:'S-SYN-81',cashRegisterSessionId:7,warehouseId:1,status:'COMPLETED',subtotalAmount:20,discountAmount:1,totalAmount:19,paidAmount:19,changeAmount:0,soldAt:'2026-11-01T10:00:00Z',createdBy:'qa.rv',items:[{id:1,productId:101,productName:product.name,productNameSnapshot:product.name,sku:'SYN-RV',skuSnapshot:'SYN-RV',barcode:null,quantity:2,quantityText:'2.00',unitPrice:10,discountAmount:1,lineTotal:19}],payments:command.payments.map((v:any,i:number)=>({...v,id:i+1,createdAt:'2026-11-01T10:00:00Z'}))}});}
   unexpected.push(req.method()+' '+p);return route.abort();
  }
  if(p.endsWith('/auth/me'))return route.fulfill({json:{id:state.actor,username:'qa.rv',roles:['CAJERO']}});
  if(p.endsWith('/warehouses'))return route.fulfill({json:[{id:1,code:'SYN',name:'Tienda sintética',type:'STORE',active:true},{id:2,code:'SYN2',name:'Depósito sintético',type:'WAREHOUSE',active:true}]});
  if(p.endsWith('/cash-registers/current'))return route.fulfill({json:{id:state.cash,status:'OPEN',openedByUserId:'qa-rv'}});
  if(p.endsWith('/billing/series')||p.endsWith('/billing/documents'))return route.fulfill({json:[]});
  if(p.endsWith('/pos/products/snapshot')){
   state.snapshots++;let selected=state.mode;if(state.hold)selected=await new Promise<string>(release=>gates.push({release}));
   if(selected==='error')return route.fulfill({status:503,json:{message:'Synthetic unavailable'}});
   const ids=(u.searchParams.get('productIds')||'').split(',').map(Number);let rows=[{...product}, {...other}].filter(v=>ids.includes(v.productId));
   if(selected==='price')rows=rows.map(v=>({...v,salePrice:12}));if(selected==='stock')rows=rows.map(v=>({...v,stockAvailable:30}));
   if(selected==='blocked')rows=rows.map(v=>({...v,stockAvailable:0}));if(selected==='policy')rows=rows.map(v=>({...v,quantityPolicy:'DECIMAL_2'}));
   if(selected==='legacy')rows=rows.map(v=>({...v,quantityPolicy:'LEGACY_UNCLASSIFIED'}));if(selected==='discount')rows=rows.map(v=>({...v,salePrice:.25}));
   return route.fulfill({json:rows});
  }
  if(p.endsWith('/pos/products/search'))return route.fulfill({json:[product,other]});
  if(p.endsWith('/sales/operations'))return route.fulfill({json:{items:[],page:0,size:10,totalItems:0,totalPages:0}});
  if(p.endsWith('/sales/81'))return route.fulfill({json:{id:81,saleNumber:'S-SYN-81',status:'COMPLETED',subtotalAmount:20,discountAmount:1,totalAmount:19,paidAmount:19,changeAmount:0,soldAt:'2026-11-01T10:00:00Z',items:[{id:1,productId:101,productName:product.name,productNameSnapshot:product.name,sku:'SYN-RV',skuSnapshot:'SYN-RV',quantity:2,quantityText:'2.00',unitPrice:10,discountAmount:1,lineTotal:19}],payments:[{id:1,paymentMethod:'CASH',amount:10},{id:2,paymentMethod:'CARD',amount:9}]}});
  if(p.endsWith('/sales') || p.endsWith('/sales/list-items'))return route.fulfill({json:[]});
  if(p.includes('/sales/operations/'))return route.fulfill({json:{operationId,protocolVersion:1,origin:'POS',state:'PREPARED',cashRegisterSessionId:7,saleId:null,command:{operationId,warehouseId:1,confirmedTotal:19,items:[{productId:101,quantity:2,discountAmount:1,confirmedUnitPrice:10}],payments:draft.payments},receiptIntent:{receiptType:'TICKET',payload:null},receiptState:'NOT_REQUIRED'}});
  unexpected.push(p);return route.abort();
 });
 return {state,gates,writes,unexpected,errors};
}
async function shot(page:Page,ids:number[],stage:string,name:string){await mkdir(visual,{recursive:true});const file=path.join(visual,name+'.png');await page.screenshot({path:file});
 const indexFile=path.join(qa,'visual-index.json');let index:any={};try{index=JSON.parse(await readFile(indexFile,'utf8'));}catch{}
 for(const id of ids){index['RV-'+String(id).padStart(2,'0')]??={};index['RV-'+String(id).padStart(2,'0')][stage]={file,test:test.info().title};}await writeFile(indexFile,JSON.stringify(index,null,2));}
async function values(page:Page){return page.evaluate(()=>{const d=JSON.parse(sessionStorage.getItem('erp_pos_sales_draft_v1')!);return {lines:d.cart.map((v:any)=>[v.productId,String(v.quantity),String(v.discountAmount),String(v.salePrice)]),payments:d.payments.map((v:any)=>[v.paymentMethod,String(v.amount),v.reference]),warehouse:d.warehouseId,pending:d.pendingSaleRequest?.operationId??null,recovery:d.receiptRecovery?.operationId??null};});}
const review=(page:Page)=>page.getByRole('dialog',{name:'Se actualizaron condiciones de tu compra',exact:true});
const cart=(page:Page)=>page.locator('app-pos-cart-panel');
const checkout=(page:Page)=>page.getByRole('dialog',{name:'Cobrar venta',exact:true});
async function ready(page:Page){await expect(page.locator('[aria-label="Condiciones de la compra"]')).toHaveCount(0);await expect(page.getByRole('button',{name:'COBRAR',exact:true})).toBeEnabled();}
async function returnToPOS(page:Page){await page.getByRole('link',{name:'Ventas',exact:true}).click();await page.getByRole('link',{name:'Punto de venta',exact:true}).click();}
function clean(s:Awaited<ReturnType<typeof setup>>,writes=0){expect(s.unexpected).toEqual([]);expect(s.errors).toEqual([]);expect(s.writes.length).toBe(writes);}

test('RV-01/02/14 return and refresh verify silently without duplicate reads or mutations',async({page})=>{
 await page.setViewportSize({width:1440,height:900});const s=await setup(page);s.state.hold=true;await page.goto('/pos');await expect.poll(()=>s.gates.length).toBe(1);
 const before=await values(page);await shot(page,[1,2,14],'initial','restore-verifying');s.state.hold=false;s.gates[0].release('same');await ready(page);
 await expect(review(page)).toHaveCount(0);expect(await values(page)).toEqual(before);await shot(page,[1,2,14],'final','verified-desktop');
 await returnToPOS(page);await ready(page);expect(await values(page)).toEqual(before);expect(s.state.snapshots).toBe(2);await expect(review(page)).toHaveCount(0);
 await page.getByRole('button',{name:'COBRAR',exact:true}).click();await expect(checkout(page)).toBeVisible();expect(s.state.snapshots).toBe(2);await checkout(page).getByRole('button',{name:'Cerrar',exact:true}).click();
 await page.reload();await ready(page);expect(s.state.snapshots).toBe(3);expect(await values(page)).toEqual(before);clean(s);
});
for(const [mode,id]of [['price',3],['stock',4],['discount',5],['policy',6],['blocked',7]]as const){
 test('RV-'+String(id).padStart(2,'0')+' '+mode+' preserves the draft until permitted decision',async({page})=>{
  await page.setViewportSize({width:1440,height:900});const s=await setup(page,mode);s.state.hold=true;await page.goto('/pos');await expect.poll(()=>s.gates.length).toBe(1);const before=await values(page);await shot(page,[id],'initial','initial-'+mode);
  s.state.hold=false;s.gates[0].release(mode);
  if(mode==='price'||mode==='policy'){
   await expect(review(page)).toBeVisible();await expect(review(page)).not.toContainText('LEGACY_UNCLASSIFIED');await shot(page,[id],'intervention','changes-'+mode);
   await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Revisar cambios',exact:true}).first()).toBeFocused();expect(await values(page)).toEqual(before);await expect(checkout(page)).toHaveCount(0);await shot(page,[id],'final','kept-'+mode);
  }else if(mode==='stock'){await ready(page);expect((await values(page)).lines).toEqual(before.lines);await expect(review(page)).toHaveCount(0);await shot(page,[id],'final','compatible-stock');}
  else{await expect(page.getByRole('alert')).toContainText(mode==='blocked'?'stock disponible 0':'descuento');expect(await values(page)).toEqual(before);await expect(review(page)).toHaveCount(0);
   await page.getByRole('button',{name:'Revisar carrito',exact:true}).click();await expect(checkout(page)).toHaveCount(0);await shot(page,[id],'final','incompatible-'+mode);}
  clean(s);
 });
}
test('RV-08/09/15/17 review before checkout, keep or apply only the matching proposal',async({page})=>{
 const s=await setup(page,'price');await page.goto('/pos');await expect(review(page)).toBeVisible();const before=await values(page);
 await shot(page,[8,9,15,17],'initial','pending-price');await page.keyboard.press('Escape');expect(await values(page)).toEqual(before);await shot(page,[9],'final','price-rejected');
 await page.getByRole('button',{name:'Revisar cambios',exact:true}).last().click();await expect(review(page)).toBeVisible();await expect(checkout(page)).toHaveCount(0);await shot(page,[8,15,17],'intervention','review-before-checkout');
 await review(page).getByRole('button',{name:'Actualizar carrito con condiciones vigentes',exact:true}).click();await expect(checkout(page)).toBeVisible();const after=await values(page);
 expect(after.lines).toEqual([[101,'2','1','12']]);expect(after.payments).toEqual(before.payments);expect(after.pending).toBeNull();
 await shot(page,[8,15,17],'final','applied-checkout');await checkout(page).getByRole('button',{name:'Cerrar',exact:true}).click();clean(s);
});
test('RV-10/16 failed verification preserves B and retry is a read, not a checkout',async({page})=>{
 const s=await setup(page,'error');await page.goto('/pos');const before=await values(page);await expect(page.getByRole('alert')).toContainText('No pudimos verificar tu compra');
 await shot(page,[10,16],'initial','network-error');await page.getByRole('button',{name:'Reintentar verificación',exact:true}).last().click();await expect(checkout(page)).toHaveCount(0);expect(await values(page)).toEqual(before);
 s.state.mode='same';await page.getByRole('button',{name:'Reintentar verificación',exact:true}).last().click();await expect(checkout(page)).toBeVisible();expect(await values(page)).toEqual(before);await shot(page,[10,16],'final','retry-checkout');clean(s);
});
test('RV-11 real read timeout and late response never apply; retry can verify',async({page})=>{
 await page.clock.install();const s=await setup(page);s.state.hold=true;await page.goto('/pos');await expect.poll(()=>s.gates.length).toBe(1);const before=await values(page);
 await shot(page,[11],'initial','timeout-pending');await page.clock.runFor(15001);await expect(page.getByRole('alert')).toContainText('No pudimos verificar tu compra');await shot(page,[11],'intervention','timeout-error');
 s.state.hold=false;s.gates[0].release('price');await page.getByRole('button',{name:'Reintentar verificación',exact:true}).first().click();await ready(page);expect(await values(page)).toEqual(before);await expect(review(page)).toHaveCount(0);await shot(page,[11],'final','timeout-retried');clean(s);
});
test('RV-12/13 edited B and newer read reject the first response',async({page})=>{
 const s=await setup(page);s.state.hold=true;await page.goto('/pos');await expect.poll(()=>s.gates.length).toBe(1);await shot(page,[12,13],'initial','editing-pending');
 await cart(page).getByLabel('Cantidad del producto',{exact:true}).fill('3');const before=await values(page);await shot(page,[12,13],'intervention','edited-stale');
 s.state.hold=false;await page.getByRole('button',{name:'Comprobar condiciones',exact:true}).click();await ready(page);s.gates[0].release('price');expect(await values(page)).toEqual(before);await expect(review(page)).toHaveCount(0);await shot(page,[12,13],'final','newer-verification');clean(s);
});
test('RV-18 changed credential or actor invalidates an open proposal without applying',async({page})=>{
 const s=await setup(page,'price');await page.goto('/pos');await expect(review(page)).toBeVisible();const before=await values(page);await shot(page,[18],'initial','session-proposal');
 s.state.actor='different-owner';await page.evaluate(()=>localStorage.setItem('erp_pos_token','synthetic-changed'));
 await expect(review(page)).toHaveCount(0);await expect(page.getByRole('region',{name:'Condiciones de la compra',exact:true})).toContainText('sesión');
 expect(await values(page)).toEqual(before);await page.getByRole('button',{name:'Verificar compra',exact:true}).click();await expect(checkout(page)).toHaveCount(0);await shot(page,[18],'final','session-invalid');clean(s);
});
test('RV-19/22 new warehouse inside checkout explains the block and preserves payments',async({page})=>{
 const s=await setup(page);await page.goto('/pos');await ready(page);await page.getByRole('button',{name:'COBRAR',exact:true}).click();await expect(checkout(page)).toBeVisible();const before=await values(page);await shot(page,[19,22],'initial','checkout-valid');
 // The real guarded reactive control receives the same change event as an external context update while checkout owns focus.
 await page.getByRole('combobox',{name:'Almacén de salida',exact:true}).evaluate((el:HTMLSelectElement)=>{el.value=Array.from(el.options).find(o=>o.textContent?.includes('Depósito'))!.value;el.dispatchEvent(new Event('change',{bubbles:true}));});
 await expect(checkout(page)).toContainText('almacén');s.state.mode='blocked';await checkout(page).getByRole('button',{name:'Verificar compra',exact:true}).click();await expect(checkout(page)).toContainText('stock disponible 0');
 expect((await values(page)).payments).toEqual(before.payments);await shot(page,[19,22],'final','checkout-blocked');clean(s);
});
test('RV-20 close checkout has no duplicated verification notices',async({page})=>{
 const s=await setup(page);await page.goto('/pos');await ready(page);await page.getByRole('button',{name:'COBRAR',exact:true}).click();await shot(page,[20],'initial','checkout-before-close');
 await page.keyboard.press('Escape');await expect(checkout(page)).toHaveCount(0);await expect(page.getByRole('alert')).toHaveCount(0);await expect(page.locator('[aria-label="Condiciones de la compra"]')).toHaveCount(0);await shot(page,[20],'final','checkout-closed');clean(s);
});
test('RV-21 complete synthetic checkout once after valid read',async({page})=>{
 const s=await setup(page);s.state.checkout=true;await page.goto('/pos');await ready(page);await shot(page,[21],'initial','valid-before-sale');await page.getByRole('button',{name:'COBRAR',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'Confirmar venta',exact:true})).toHaveCount(0);await shot(page,[21],'intervention','financial-confirmation');
 await checkout(page).getByRole('button',{name:'Confirmar venta',exact:true}).click();await expect(page.getByRole('dialog',{name:'Venta #81 · Registrada',exact:true})).toContainText(/Total confirmado: S\/\s*19\.00/);
 await shot(page,[21],'final','sale-confirmed');expect(s.writes).toEqual(['POST /api/v1/sales/operations','POST /api/v1/sales']);clean(s,2);
});
test('RV-23 durable uncertain identity bypasses editable draft revalidation',async({page})=>{
 const s=await setup(page);await page.addInitScript(id=>{const d=JSON.parse(sessionStorage.getItem('erp_pos_sales_draft_v1')!);d.pendingSaleRequest={operationId:id,warehouseId:1,confirmedTotal:19,items:[{productId:101,quantity:2,discountAmount:1,confirmedUnitPrice:10}],payments:d.payments};d.receiptRecovery={version:1,userId:'qa-rv',operationId:id,receiptType:'TICKET',payload:null,customerAddress:'',saleId:null,documentId:null,creationState:'NOT_STARTED'};sessionStorage.setItem('erp_pos_sales_draft_v1',JSON.stringify(d));},operationId);
 await page.goto('/pos');await expect(page.getByRole('button',{name:'COMPROBAR RESULTADO',exact:true})).toBeVisible();const before=await values(page);await shot(page,[23],'initial','durable-uncertain');
 expect(s.state.snapshots).toBe(0);await page.getByRole('button',{name:'COMPROBAR RESULTADO',exact:true}).click();await expect(page.getByRole('button',{name:'REVISAR PREPARACIÓN',exact:true})).toBeVisible();
 expect((await values(page)).pending).toBe(operationId);expect((await values(page)).payments).toEqual(before.payments);expect(s.state.snapshots).toBe(0);await shot(page,[23],'final','durable-prepared');clean(s);
});
for(const width of [768,390,320])test('responsive main verification states '+width,async({page})=>{
 await page.setViewportSize({width,height:width===768?1024:844});const s=await setup(page,'price',width===768?'light':'dark');s.state.hold=true;await page.goto('/pos');await expect.poll(()=>s.gates.length).toBe(1);await shot(page,[],'initial','compact-pending-'+width);s.state.hold=false;s.gates[0].release('price');await expect(review(page)).toBeVisible();
 const r=review(page);const controls=r.locator('button:not(:disabled),[tabindex="0"]');
 await controls.first().focus();await page.keyboard.press('Shift+Tab');await expect(controls.last()).toBeFocused();await page.keyboard.press('Tab');await expect(controls.first()).toBeFocused();
 const measured=await r.getByRole('button',{name:'Actualizar carrito con condiciones vigentes',exact:true}).evaluate(el=>{
  const c=getComputedStyle(el);const luminance=(value:string)=>{const rgb=value.match(/[0-9.]+/g)!.slice(0,3).map(Number).map(n=>{const v=n/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];};const a=luminance(c.color),b=luminance(c.backgroundColor);return {foreground:c.color,background:c.backgroundColor,image:c.backgroundImage,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05),height:el.getBoundingClientRect().height,width:el.getBoundingClientRect().width};});
 expect(measured.image).toBe('none');expect(measured.ratio).toBeGreaterThanOrEqual(4.5);// WCAG 2.2 SC 2.5.8 (AA): minimum 24 x 24 CSS px; 44 px is the enhanced target criterion.
 expect(measured.height).toBeGreaterThanOrEqual(24);expect(measured.width).toBeGreaterThanOrEqual(24);await writeFile(path.join(qa,'contrast-'+width+'.json'),JSON.stringify(measured,null,2));
 await expect(r.getByRole('button',{name:'Actualizar carrito con condiciones vigentes',exact:true})).toHaveClass(/ui-button--primary/);await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab');await expect.poll(()=>r.evaluate(el=>el.contains(document.activeElement))).toBe(true);
 expect(await r.evaluate(el=>{const b=el.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth&&b.top>=0&&b.bottom<=innerHeight;})).toBe(true);await shot(page,[],'intervention','compact-differences-'+width);
 await page.keyboard.press('Escape');await expect(r).toHaveCount(0);await shot(page,[],'final','compact-kept-'+width);s.state.mode='error';await page.getByRole('button',{name:'Revisar cambios',exact:true}).last().click();await expect(page.getByRole('alert')).toContainText('No pudimos verificar');await shot(page,[],'intervention','compact-error-'+width);
 s.state.mode='blocked';await page.getByRole('button',{name:'Reintentar verificación',exact:true}).last().click();await expect(page.getByRole('alert')).toContainText('stock disponible 0');await shot(page,[],'intervention','compact-blocked-'+width);
 s.state.mode='same';await page.getByRole('button',{name:'Revisar carrito',exact:true}).click();await expect(checkout(page)).toBeVisible();await shot(page,[],'final','compact-enabled-'+width);await page.keyboard.press('Escape');await ready(page);expect(await page.locator('body').evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await shot(page,[],'final','compact-normal-'+width);clean(s);
});

test('RV-13 displayed proposal becomes obsolete after a later cart edit',async({page})=>{
 const s=await setup(page,'price');await page.goto('/pos');await expect(review(page)).toBeVisible();await shot(page,[13],'initial','obsolete-proposal');
 await cart(page).getByLabel('Cantidad del producto',{exact:true}).evaluate((el:HTMLInputElement)=>{el.value='3';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await expect(review(page)).toHaveCount(0);const before=await values(page);expect(before.lines).toEqual([[101,'3','1','10']]);await shot(page,[13],'intervention','proposal-invalidated');
 s.state.mode='same';await page.getByRole('button',{name:'Verificar compra',exact:true}).click();await expect(checkout(page)).toBeVisible();expect(await values(page)).toEqual(before);await shot(page,[13],'final','obsolete-not-applied');clean(s);
});



test('light desktop before/after reference without an identical-conditions modal',async({page})=>{
 await page.setViewportSize({width:1440,height:900});const s=await setup(page,'same','light');await page.goto('/pos');await ready(page);
 await expect(review(page)).toHaveCount(0);await expect(page.getByRole('alertdialog')).toHaveCount(0);await expect(page.locator('[aria-label="Condiciones de la compra"]')).toHaveCount(0);
 expect((await values(page)).lines).toEqual([[101,'2','1','10']]);await shot(page,[],'final','after-light-desktop');clean(s);
});
async function installTransientProbe(page:Page){
 const methods:string[]=[];page.on('request',request=>{const u=new URL(request.url());if(u.pathname.startsWith('/api/'))methods.push(request.method()+' '+u.pathname);});
 await page.addInitScript(()=>{
  const samples:any[]=[];const sample=()=>{
   const button=document.querySelector<HTMLButtonElement>('.checkout-button'),results=document.querySelector('app-pos-search-results'),root=document.querySelector('app-pos-page .pos-page');
   if(!button?.textContent?.includes('Verificando compra')||!results||!root||!document.querySelector('app-pos-cart-item'))return;
   samples.push({time:performance.now(),resultY:results.getBoundingClientRect().top-root.getBoundingClientRect().top,card:!!document.querySelector('.cart-verification'),stack:!!document.querySelector('.message-stack'),dialogs:document.querySelectorAll('[aria-modal="true"]').length,disabled:button.disabled,focus:document.activeElement?.getAttribute('aria-label')??document.activeElement?.tagName});
  };
  new MutationObserver(sample).observe(document,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','class']});
  (window as any).__transientProbe={samples,reset:()=>samples.splice(0),sample};
 });return methods;
}
async function transientGeometry(page:Page){return page.evaluate(()=>{
 const root=document.querySelector('app-pos-page .pos-page')!,results=document.querySelector('app-pos-search-results')!,status=document.querySelector('.pos-verification-status')!,main=document.querySelector<HTMLButtonElement>('.checkout-button')!;
 return {resultY:results.getBoundingClientRect().top-root.getBoundingClientRect().top,card:!!document.querySelector('.cart-verification'),stack:!!document.querySelector('.message-stack'),label:main.textContent!.trim(),disabled:main.disabled,status:status.textContent,live:status.closest('[aria-live]')?.getAttribute('aria-live'),position:getComputedStyle(status).position,dialogs:document.querySelectorAll('[aria-modal="true"]').length,inert:document.querySelectorAll('[inert]').length,focus:document.activeElement?.getAttribute('aria-label')??document.activeElement?.tagName};
});}
async function transientRecord(page:Page,id:string,before:any,during:any,methods:string[],s:Awaited<ReturnType<typeof setup>>){
 const after=await transientGeometry(page),samples=await page.evaluate(()=>(window as any).__transientProbe.samples);
 expect(samples.length).toBeGreaterThan(0);for(const sample of samples){expect(sample.card).toBe(false);expect(sample.stack).toBe(false);expect(sample.dialogs).toBe(0);expect(sample.disabled).toBe(true);}
 const first=during??samples[0];if(id!=='T-04')expect(Math.abs(after.resultY-first.resultY)).toBeLessThanOrEqual(.5);
 expect(await values(page)).toEqual(before);expect(methods.every(method=>method.startsWith('GET '))).toBe(true);clean(s);
 await mkdir(path.join(qa,'transient'),{recursive:true});await writeFile(path.join(qa,'transient',id+'.json'),JSON.stringify({id,before,during:first,after,delta:after.resultY-first.resultY,samples,methods,businessAfter:await values(page)},null,2));
 await page.screenshot({path:path.join(qa,'transient',id+'-after.png'),fullPage:true});
}
test('T-01 transient fix: return from Sales without checking card or empty row',async({page})=>{
 await page.setViewportSize({width:1440,height:900});const methods=await installTransientProbe(page),s=await setup(page);await page.goto('/pos');await ready(page);const before=await values(page);
 await page.getByRole('link',{name:'Ventas',exact:true}).click();await page.evaluate(()=>(window as any).__transientProbe.reset());await page.getByRole('link',{name:'Punto de venta',exact:true}).click();await ready(page);
 expect(s.state.snapshots).toBe(2);await transientRecord(page,'T-01',before,null,methods,s);
});
test('T-02 transient fix: refresh runs verification without the 95px shift',async({page})=>{
 await page.setViewportSize({width:1440,height:900});const methods=await installTransientProbe(page),s=await setup(page);await page.goto('/pos');await ready(page);const before=await values(page);await page.reload();await ready(page);
 expect(s.state.snapshots).toBe(2);await transientRecord(page,'T-02',before,null,methods,s);
});
for(const width of [1440,768,390,320])test('T-03 transient fix: held verification, accessible status and stable results '+width,async({page})=>{
 await page.setViewportSize({width,height:width===768?1024:width===1440?900:844});const methods=await installTransientProbe(page),s=await setup(page,'same',width===768?'light':'dark');s.state.hold=true;await page.goto('/pos');await expect.poll(()=>s.gates.length).toBe(1);
 const before=await values(page),during=await transientGeometry(page),status=page.locator('.pos-verification-status');const statusNode=await status.elementHandle();
 expect(during.card).toBe(false);expect(during.stack).toBe(false);expect(during.live).toBe('polite');expect(during.position).toBe('absolute');expect(during.status).toContain('Verificando condiciones');expect(during.disabled).toBe(true);expect(during.label).toBe('Verificando compra…');
 expect(during.dialogs).toBe(0);expect(during.inert).toBe(0);await expect(status).toHaveAttribute('aria-atomic','true');expect(await status.getAttribute('tabindex')).toBeNull();
 const search=page.getByLabel('Buscar producto por nombre, SKU o código',{exact:true});await search.click();await search.fill('consulta sintética');await search.press('Enter');await expect(search).toBeFocused();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');await search.focus();
 await page.locator('.pos-cash-details > summary').focus();await expect(page.locator('.pos-cash-details > summary')).toBeFocused();await search.focus();
 await mkdir(path.join(qa,'transient'),{recursive:true});await page.screenshot({path:path.join(qa,'transient','T-03-'+width+'-during.png'),fullPage:true});
 s.state.hold=false;s.gates[0].release('same');await ready(page);expect(await statusNode!.evaluate(el=>el===document.querySelector('.pos-verification-status'))).toBe(true);await expect(status).toContainText('Puedes revisar el cobro');await expect(search).toBeFocused();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await transientRecord(page,'T-03-'+width,before,during,methods,s);
});
test('T-04 transient fix: visible 503 error and safe retry, no duplicated warning or checkout',async({page})=>{
 const methods=await installTransientProbe(page),s=await setup(page);s.state.hold=true;await page.goto('/pos');await expect.poll(()=>s.gates.length).toBe(1);const before=await values(page),during=await transientGeometry(page);
 s.state.hold=false;s.state.mode='error';s.gates[0].release('error');await expect(page.locator('.cart-verification [role="alert"]')).toHaveCount(1);await expect(page.locator('.cart-verification [role="alert"]')).toContainText('No pudimos verificar');
 await expect(page.locator('.pos-verification-status')).toHaveText('');await expect(page.getByRole('dialog')).toHaveCount(0);await page.getByRole('button',{name:'Reintentar verificación',exact:true}).last().click();await expect.poll(()=>s.state.snapshots).toBe(2);await expect(page.getByRole('dialog')).toHaveCount(0);expect(await values(page)).toEqual(before);
 await transientRecord(page,'T-04',before,during,methods,s);
});
test('T-difference transient fix: preserves the legitimate commercial review',async({page})=>{
 const s=await setup(page,'price');await page.goto('/pos');await expect(review(page)).toBeVisible();const before=await values(page);await expect(review(page)).toContainText('precio S/ 10.00 → S/ 12.00');
 await mkdir(path.join(qa,'transient'),{recursive:true});await page.screenshot({path:path.join(qa,'transient','commercial-review.png')});await page.keyboard.press('Escape');expect(await values(page)).toEqual(before);await expect(page.getByRole('button',{name:'Revisar cambios',exact:true}).first()).toBeFocused();clean(s);
});
