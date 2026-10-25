import {test,expect,fixture,login,logout,browserApi,snapshot,prepareBody,posCart,confirmSale,closeCheckoutIfOpen,openRecovery,selectOperation,screenshot,usable,guardContext} from "../../helpers/recovery-commercial";

test("E2E 1 normal POS: preparation precedes one sale, stock/payment/cash persist",async({page,qa,posts})=>{
  const f=fixture(qa,1);await login(page,f.username);let operationId="",beforeDispatch:any,committed!:()=>void,release!:()=>void;
  const reached=new Promise<void>(r=>committed=r),gate=new Promise<void>(r=>release=r);
  await page.route("**/api/v1/sales",async route=>{
    if(route.request().method()!=="POST")return route.continue();
    operationId=route.request().postDataJSON().operationId;beforeDispatch=await snapshot(page,1,operationId);
    const response=await route.fetch();expect(response.status()).toBe(201);committed();await gate;await route.fulfill({response});
  });
  const modal=await posCart(page,f,2);await usable(modal.getByRole("button",{name:"COBRAR",exact:true}));await screenshot(page,"01-desktop-checkout");
  await confirmSale(page,modal,true);await reached;
  expect(beforeDispatch.operation.state).toBe("PREPARED");expect(beforeDispatch.sales).toBe(0);
  await expect(page.getByRole("button",{name:"Cobrando...",exact:true}).first()).toBeDisabled();
  const stored=await snapshot(page,1,operationId);expect(stored.sales).toBe(1);expect(stored.payments).toBe(1);expect(Number(stored.paid)).toBe(20);
  expect(stored.movements).toBe(1);expect(Number(stored.movement_quantity)).toBe(2);expect(Number(stored.stock)).toBe(98);
  expect(stored.operation!.state).toBe("COMPLETED");expect(stored.operation!.original_cash_session_id).toBe(f.cash_id);
  expect(posts.filter(p=>p.path==="/api/v1/sales")).toHaveLength(1);release();
  await expect(page.getByText(/registrada correctamente/)).toBeVisible();
  expect(posts.filter(p=>p.path==="/api/v1/sales/operations")).toHaveLength(1);
  const close=await browserApi(page,"POST",`/api/v1/cash-registers/${f.cash_id}/close`,{countedAmount:20,notes:"Synthetic E2E reconciliation"});
  expect(close.status).toBe(200);expect(Number(close.body.expectedCashAmount)).toBe(20);expect(Number(close.body.differenceAmount)).toBe(0);
  expect((await snapshot(page,1)).cash_status).toBe("CLOSED");await screenshot(page,"01-desktop-success");
});

test("E2E 2 committed PREPARED response lost: no automatic checkout, same identity recovered",async({page,qa,posts})=>{
  const f=fixture(qa,2);await login(page,f.username);let id="";
  await page.route("**/api/v1/sales/operations",async route=>{if(route.request().method()!=="POST")return route.continue();
    id=route.request().postDataJSON().operationId;const response=await route.fetch();expect(response.status()).toBe(201);await route.abort("failed");});
  await confirmSale(page,await posCart(page,f));
  await expect(page.getByRole("dialog",{name:"Cobrar venta",exact:true}).getByRole("alert").filter({hasText:/No se confirmó la respuesta de preparación/})).toBeVisible();
  await screenshot(page,"02-preparation-uncertain-modal");
  const state=await snapshot(page,2,id);expect(state.operation!.state).toBe("PREPARED");expect(state.sales).toBe(0);expect(state.payments).toBe(0);expect(state.movements).toBe(0);expect(Number(state.stock)).toBe(100);
  expect(posts.filter(p=>p.path==="/api/v1/sales")).toHaveLength(0);await closeCheckoutIfOpen(page);
  const panel=await selectOperation(page,id);await expect(panel.getByText(/Estado comercial: PREPARED/)).toBeVisible();
  await screenshot(page,"02-preparation-uncertain-recovered");expect(posts.filter(p=>p.path==="/api/v1/sales")).toHaveLength(0);
});

test("E2E 3 committed sale response lost: empty new browser context discovers same result without POST",async({page,browser,qa,posts})=>{
  const f=fixture(qa,3);await login(page,f.username);let id="";
  await page.route("**/api/v1/sales",async route=>{if(route.request().method()!=="POST")return route.continue();id=route.request().postDataJSON().operationId;
    const response=await route.fetch();expect(response.status()).toBe(201);await route.abort("failed");});
  await confirmSale(page,await posCart(page,f));await expect(page.getByRole("dialog",{name:"Cobrar venta",exact:true}).getByRole("alert").filter({hasText:/^No hay conexion con el servidor\. Verifica que el backend este activo\.$/})).toBeVisible();
  await screenshot(page,"03-sale-uncertain-modal");
  const original=await snapshot(page,3,id);expect(original.sales).toBe(1);expect(original.operation!.state).toBe("COMPLETED");
  const fresh=await browser.newContext({baseURL:"http://127.0.0.1:4201",viewport:{width:1366,height:768},serviceWorkers:"block"});
  const violations:string[]=[],pageErrors:string[]=[];await guardContext(fresh,violations,pageErrors);const restored=await fresh.newPage();
  const afterPosts:string[]=[];restored.on("request",r=>{if(r.method()==="POST"&&new URL(r.url()).pathname!=="/api/v1/auth/login")afterPosts.push(new URL(r.url()).pathname);});
  try{await login(restored,f.username);expect(await restored.evaluate(()=>sessionStorage.length)).toBe(0);await restored.goto("/pos");
    const panel=await selectOperation(restored,id);await expect(panel.getByText(/Estado comercial: COMPLETED/)).toBeVisible();
    await panel.getByRole("button",{name:"Consultar esta venta",exact:true}).click();await expect(restored.getByText(`Venta #${original.operation!.sale_id} confirmada. Comprobante: NOT_REQUIRED.`,{exact:true})).toBeVisible();
    expect(afterPosts).toEqual([]);expect(violations).toEqual([]);expect(pageErrors).toEqual([]);const recovered=await snapshot(restored,3,id);expect(recovered).toEqual(original);await screenshot(restored,"03-new-browser-recovered");
  }finally{await fresh.close();}
  expect(posts.filter(p=>p.path==="/api/v1/sales")).toHaveLength(1);
});

test("E2E 4 two independent pending operations: select, cancel terminal identity and serve next purchase",async({page,qa,posts})=>{
  const f=fixture(qa,4);await page.setViewportSize({width:960,height:720});await login(page,f.username);await page.goto("/pos");
  const a=prepareBody(f),b=prepareBody(f);expect((await browserApi(page,"POST","/api/v1/sales/operations",a)).status).toBe(201);
  expect((await browserApi(page,"POST","/api/v1/sales/operations",b)).status).toBe(201);
  let panel=await selectOperation(page,a.operationId);await expect(panel.getByRole("button",{name:new RegExp(b.operationId.slice(0,8))})).toBeVisible();
  await selectOperation(page,b.operationId);expect((await snapshot(page,4)).sales).toBe(0);
  await selectOperation(page,a.operationId);await panel.getByRole("button",{name:"Cancelar preparación",exact:true}).click();await panel.getByRole("button",{name:"Confirmar cancelación",exact:true}).click();
  await expect(panel.getByText(/Estado comercial: CANCELLED/)).toBeVisible();expect((await browserApi(page,"POST","/api/v1/sales",a.command)).status).toBe(409);
  expect((await snapshot(page,4,a.operationId)).operation!.state).toBe("CANCELLED");expect((await snapshot(page,4,b.operationId)).operation!.state).toBe("PREPARED");
  panel=await selectOperation(page,b.operationId);await usable(panel.getByRole("button",{name:"Revisar y reanudar esta operación",exact:true}));await screenshot(page,"04-small-pending-list");
  await panel.getByRole("button",{name:"Revisar y reanudar esta operación",exact:true}).click();const confirm=page.getByRole("alertdialog",{name:"Reanudar preparación",exact:true});
  await expect(confirm.getByRole("button",{name:"Conservar",exact:true})).toBeFocused();await page.keyboard.press("Tab");await expect(confirm.getByRole("button",{name:"Reanudar mismo cobro",exact:true})).toBeFocused();
  await page.keyboard.press("Enter");await expect(page.getByText(/registrada correctamente/)).toBeVisible();
  const state=await snapshot(page,4,b.operationId);expect(state.sales).toBe(1);expect(state.operation!.state).toBe("COMPLETED");expect(state.payments).toBe(1);expect(state.movements).toBe(1);
  expect(posts.filter(p=>p.path==="/api/v1/sales")).toHaveLength(2);await screenshot(page,"04-small-success");
});

test("E2E 5 user switch: foreign operation hidden and 404, original owner recovers",async({page,qa,posts})=>{
  const f=fixture(qa,5);await login(page,f.username);await page.goto("/pos");const body=prepareBody(f);
  expect((await browserApi(page,"POST","/api/v1/sales/operations",body)).status).toBe(201);await selectOperation(page,body.operationId);
  await logout(page);await login(page,process.env.E2E_QA_USER+"_other");await page.goto("/pos");const panel=await openRecovery(page);
  await expect(panel.getByText("No hay operaciones para este filtro.",{exact:true})).toBeVisible();await expect(panel.getByText(new RegExp(body.operationId))).toHaveCount(0);
  const denied=await browserApi(page,"GET","/api/v1/sales/operations/"+body.operationId);expect(denied.status).toBe(404);expect(denied.noStore).toBe("no-store");
  expect(JSON.stringify(denied.body)).not.toContain(f.username);expect(JSON.stringify(denied.body)).not.toContain("receiptIntent");
  await screenshot(page,"05-other-user-empty");await logout(page);await login(page,f.username);await page.goto("/pos");await selectOperation(page,body.operationId);
  expect((await snapshot(page,5,body.operationId)).operation!.state).toBe("PREPARED");expect(posts.filter(p=>p.path==="/api/v1/sales")).toHaveLength(0);
});

for(const [n,type]of [[6,"RECEIPT"],[7,"INVOICE"]] as const){
  test(`E2E 6 ${type}: original series/customer survive lost document response, DRAFT recovered once`,async({page,qa,posts})=>{
    const f=fixture(qa,n);await login(page,f.username);let id="";
    page.on("request",r=>{if(new URL(r.url()).pathname==="/api/v1/sales"&&r.method()==="POST")id=r.postDataJSON().operationId;});
    const series=qa.series.find(s=>s.document_type===type)!;
    let documentStatus=0;
    await page.route("**/api/v1/billing/documents/from-sale/*",async route=>{const response=await route.fetch();documentStatus=response.status();
      if(documentStatus===201)await route.abort("failed");else await route.fulfill({response});});
    const modal=await posCart(page,f);await modal.getByRole("button",{name:type==="INVOICE"?"Factura":"Boleta",exact:true}).click();
    await modal.getByRole("combobox",{name:/^Serie de comprobante \*/}).selectOption(String(series.id));
    const customer="Cliente sintetico QA "+type,number=type==="INVOICE"?"20123456789":"12345678";
    await modal.getByLabel(type==="INVOICE"?/^RUC \*/:"Documento (DNI)",{exact:type!=="INVOICE"}).fill(number);
    await modal.getByLabel(type==="INVOICE"?/^Razón social \*/:"Nombre del cliente",{exact:type!=="INVOICE"}).fill(customer);await confirmSale(page,modal);
    await expect.poll(()=>documentStatus).toBe(201);
    await expect.poll(async()=>(await snapshot(page,n,id)).documents).toBe(1);
    await expect(modal.getByRole("button",{name:"Cobrando...",exact:true})).toHaveCount(0);await closeCheckoutIfOpen(page);
    const original=await snapshot(page,n,id);expect(original.operation!.document_type).toBe(type);expect(original.operation!.billing_series_id).toBe(series.id);
    expect(original.operation!.customer_name).toBe(customer);expect(original.operation!.customer_document).toBe(number);expect(original.operation!.document_status).toBe("DRAFT");
    expect(JSON.parse(original.operation!.receipt_intent).receiptType).toBe(type);expect(original.operation!.next_number).toBe(2);
    await page.evaluate(()=>sessionStorage.clear());await page.reload();const panel=await selectOperation(page,id);
    await expect(panel.getByText(/Borrador local; pendiente de procesamiento fiscal/)).toBeVisible();
    await panel.getByRole("button",{name:"Consultar esta venta",exact:true}).click();await expect(page.getByText(/no se creó otro documento/i)).toBeVisible();
    expect(posts.filter(p=>p.path.startsWith("/api/v1/billing/documents/from-sale/"))).toHaveLength(1);
    expect((await snapshot(page,n,id))).toEqual(original);await screenshot(page,`06-${type.toLowerCase()}-draft-recovered`);
  });
}

test("E2E 6 quote consumer: real UI prepares then converts through original route once",async({page,qa,posts})=>{
  const f=fixture(qa,8);await login(page,f.username);await page.goto(`/cotizaciones/${f.quote_id}/convertir`);
  await expect(page.getByRole("heading",{name:"Convertir cotizacion a venta",exact:true})).toBeVisible();
  const warehouse=page.getByRole("combobox",{name:/^Almacen de salida \*/});
  await expect(warehouse.locator("option")).toHaveCount(2);
  const warehouseValue=await warehouse.locator("option").evaluateAll(options=>(options.find(o=>o.textContent?.includes("Almacen recovery QA")) as HTMLOptionElement|undefined)?.value);
  expect(warehouseValue).toBeTruthy();await warehouse.selectOption(warehouseValue!);
  const prices=page.waitForResponse(r=>new URL(r.url()).pathname==="/api/v1/pos/products/snapshot");
  await page.getByRole("button",{name:"Revalidar precios y disponibilidad",exact:true}).click();expect((await prices).status()).toBe(200);
  let beforeConversion:any;
  await page.route(`**/api/v1/quotes/${f.quote_id}/convert-to-sale`,async route=>{
    beforeConversion=await snapshot(page,8,route.request().postDataJSON().operationId);
    const response=await route.fetch();await route.fulfill({response});
  });
  const paymentRow=page.getByRole("row").filter({has:page.locator('select')}).last();await paymentRow.locator('input[type="text"]').first().fill("10");
  await page.getByRole("button",{name:"Convertir a venta",exact:true}).click();await page.getByRole("alertdialog",{name:"Convertir cotizacion",exact:true}).getByRole("button",{name:"Convertir",exact:true}).click();
  await expect(page.getByText(/Cotizacion convertida correctamente a venta/)).toBeVisible();
  const prepare=posts.find(p=>p.path==="/api/v1/sales/operations")!;expect(prepare).toBeTruthy();const stored=await snapshot(page,8,prepare.operationId!);
  expect(beforeConversion.operation.state).toBe("PREPARED");expect(beforeConversion.sales).toBe(0);
  expect(beforeConversion.operation.operation_id).toBe(prepare.operationId);expect(beforeConversion.operation.quote_id).toBe(f.quote_id);
  expect(stored.operation!.origin).toBe("QUOTE");expect(stored.operation!.state).toBe("COMPLETED");expect(stored.operation!.quote_id).toBe(f.quote_id);
  expect(stored.quote_sale_id).toBe(stored.operation!.sale_id);expect(stored.sales).toBe(1);expect(stored.payments).toBe(1);expect(stored.movements).toBe(1);
  expect(stored.operation!.receipt_intent).toBeNull();expect(posts.filter(p=>p.path==="/api/v1/sales")).toHaveLength(0);
  expect(Number(stored.paid)).toBe(10);expect(Number(stored.stock)).toBe(99);expect(Number(stored.movement_quantity)).toBe(1);
  const panel=await selectOperation(page,prepare.operationId!);await panel.getByRole("button",{name:"Consultar esta venta",exact:true}).click();
  await expect(page.getByText(/Conversión confirmada a venta #/)).toBeVisible();expect(await snapshot(page,8,prepare.operationId!)).toEqual(stored);
  expect(posts.filter(p=>p.path===`/api/v1/quotes/${f.quote_id}/convert-to-sale`)).toHaveLength(1);await screenshot(page,"08-quote-conversion");
});
