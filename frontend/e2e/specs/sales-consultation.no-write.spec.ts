import { test, expect, Locator, Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { BillingSummary } from "../../src/app/features/sales/data/sales.models";
import { noteSale } from "../../src/app/features/sales/internal-note/note-test-data";

const evidence = path.join(os.tmpdir(), "inktoy-ventas-rd-2", "visual-corrective");
const token = "synthetic-sales-consultation";
const fixture = () => {
  const sale = noteSale(2);
  Object.assign(sale,{subtotalAmount:22,discountAmount:1,totalAmount:21,paidAmount:30,changeAmount:9,createdBy:"synthetic.cashier",voidReason:"Validación sintética"});
  Object.assign(sale.items[0],{productNameSnapshot:"Cuaderno A4 rayado",skuSnapshot:"SYN-CUA",quantityText:"2",quantity:2,unitPrice:6,discountAmount:0,lineTotal:12});
  Object.assign(sale.items[1],{productNameSnapshot:"Lápices de color",skuSnapshot:"SYN-LAP",quantityText:"1.25",quantity:1.25,unitPrice:8,discountAmount:1,lineTotal:9});
  sale.payments=[
    {id:1,paymentMethod:"CASH",amount:27,reference:null,createdAt:sale.soldAt},
    {id:2,paymentMethod:"TRANSFER",amount:3,reference:"REF-SINTETICA-0081",createdAt:sale.soldAt},
  ];
  return sale;
};
const fiscalDocument = (status="DRAFT",environment="BETA") => ({id:901,saleId:81,billingSeriesId:21,documentType:"RECEIPT",fullNumber:"B-SYN-0009",series:"B-SYN",number:9,status,environment,
  customerName:"Cliente sintético",customerDocument:null,subtotalAmount:22,taxAmount:0,totalAmount:21,xmlGeneratedAt:null,signedAt:null,sentAt:null,
  providerTicket:null,providerMessage:null,createdAt:"2026-10-28T02:20:00Z",updatedAt:"2026-10-28T02:20:00Z",items:[]});
async function setup(page:Page, roles=["ADMIN"], theme="dark", count=1, listDocuments: readonly BillingSummary[] = []) {
  const sale=fixture(), writes:string[]=[], errors:string[]=[], unexpected:string[]=[];
  const queries: URL[] = [];
  let hold: { entered: () => void; resume: Promise<void> } | undefined;
  let documentHold: Promise<void> | undefined;
  let documentMode: unknown = [], documentStatus=200, reads=0;
  page.on("pageerror",e=>errors.push(e.message));
  page.context().on("request",request=>{ if(new URL(request.url()).pathname.includes("/api/")&&request.method()!=="GET") writes.push(request.method()+" "+request.url()); });
  await page.addInitScript(({token,theme})=>{localStorage.setItem("erp_pos_token",token);localStorage.setItem("erp_pos_theme",theme);},{token,theme});
  await page.context().route("**/api/**",async route=>{
    const request=route.request(), url=new URL(request.url());
    if(request.method()!=="GET"){await route.abort("blockedbyclient");return;}
    expect(["Bearer "+token, "Bearer synthetic-second-actor"]).toContain(request.headers()["authorization"]);
    if(url.pathname.endsWith("/auth/me"))return route.fulfill({json:{id:"synthetic-owner",username:"synthetic.cashier",email:"qa@example.invalid",roles}});
    if(url.pathname === "/api/v2/sales") {
      queries.push(url);
      if (hold) { const pending = hold; hold = undefined; pending.entered(); await pending.resume; }
      const params = url.searchParams;
      const pageIndex = Number(params.get("page")), size = Number(params.get("size"));
      const rows = Array.from({ length: count }, (_, index) => {
        const isTarget = index === (count > 20 ? 20 : 0);
        const id = isTarget ? sale.id : 200 - index;
        const document = index && index % 3 ? fiscalDocument(index % 3 === 1 ? "DRAFT" : "ACCEPTED") : null;
        return { id, saleNumber: isTarget ? sale.saleNumber : "V-SYN-" + String(id).padStart(4,"0"), soldAt: sale.soldAt,
          status: sale.status, totalAmount: sale.totalAmount + index * 2, createdBy: sale.createdBy, cashRegisterSessionId: sale.cashRegisterSessionId,
          billingSummary: listDocuments[index] ?? { hasElectronicDocument: !!document, documentId: document ? id + 900 : index === 3 ? 903 : null,
            documentType: document?.documentType ?? null, fullNumber: document ? "B-SYN-" + id : null,
            status: document?.status ?? null, environment: document?.environment ?? null } };
      }).filter(row => (!params.has("saleNumber") || row.saleNumber === params.get("saleNumber"))
        && (!params.has("saleNumberPrefix") || row.saleNumber.startsWith(params.get("saleNumberPrefix")!))
        && (!params.has("status") || row.status === params.get("status"))
        && (!params.has("hasElectronicDocument") || String(row.billingSummary.hasElectronicDocument) === params.get("hasElectronicDocument"))
        && (!params.has("documentStatus") || row.billingSummary.status === params.get("documentStatus")));
      return route.fulfill({ json: { items: rows.slice(pageIndex * size, (pageIndex + 1) * size), page: pageIndex, size,
        totalItems: rows.length, totalPages: Math.ceil(rows.length / size) } });
    }
    if(url.pathname.endsWith("/sales/81"))return route.fulfill({json:sale});
    if(url.pathname.endsWith("/cash-registers/" + sale.cashRegisterSessionId))return route.fulfill({json:{id:sale.cashRegisterSessionId,status:"OPEN"}});
    if(url.pathname.endsWith("/billing/documents")){
      reads++;
      const pending = documentHold;
      documentHold = undefined;
      await pending;
      return route.fulfill({status:documentStatus,json:documentMode});
    }
    if(url.pathname.endsWith("/billing/documents/901"))return route.fulfill({json:fiscalDocument()});
    if(url.pathname.endsWith("/billing/documents/901/history"))return route.fulfill({json:[]});
    if(roles.includes("ALMACENERO") && ["/api/v1/reports/low-stock","/api/v1/reports/inventory-movements"].includes(url.pathname))return route.fulfill({json:[]});
    if(roles.includes("ALMACENERO") && ["/api/v1/inventory/stocks","/api/v1/products"].includes(url.pathname))return route.fulfill({json:{items:[],content:[],totalItems:0,totalElements:0,totalPages:0,page:0,size:1}});
    unexpected.push(request.method()+" "+url.pathname);return route.abort("blockedbyclient");
  });
  return {sale,writes,errors,unexpected,queries,reads:()=>reads, documents:(body:unknown,status=200)=>{documentMode=body;documentStatus=status;},
    holdDocument: () => {
      let release!: () => void;
      documentHold = new Promise<void>(resolve => release = resolve);
      return release;
    },
    holdList: () => {
      let entered!: () => void, release!: () => void;
      const ready = new Promise<void>(resolve => entered = resolve);
      hold = { entered, resume: new Promise<void>(resolve => release = resolve) };
      return {ready, release};
    }};
}
async function verifyNoWrites(state:Awaited<ReturnType<typeof setup>>) { expect(state.writes).toEqual([]);expect(state.errors).toEqual([]);expect(state.unexpected).toEqual([]); }
async function verifyTextContrast(target: Locator) {
  const ratio = await target.evaluate(element => {
    const style = getComputedStyle(element);
    let background = style.backgroundColor;
    let ancestor = element.parentElement;
    while (ancestor && background === "rgba(0, 0, 0, 0)") {
      background = getComputedStyle(ancestor).backgroundColor;
      ancestor = ancestor.parentElement;
    }
    const luminance = (color: string) => {
      const [red, green, blue] = (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(value => {
        const channel = Number(value) / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return red * 0.2126 + green * 0.7152 + blue * 0.0722;
    };
    const text = luminance(style.color), surface = luminance(background);
    return (Math.max(text, surface) + 0.05) / (Math.min(text, surface) + 0.05);
  });
  expect(ratio).toBeGreaterThanOrEqual(4.5);
}

for (const width of [1440, 1024, 390, 320]) for (const theme of ["light", "dark"]) {
  test(`compact sales documents ${width} ${theme}`, async ({page}) => {
    const absent: BillingSummary = { hasElectronicDocument: false, documentId: null, documentType: null,
      fullNumber: null, status: null, environment: null };
    const receipt: BillingSummary = { hasElectronicDocument: true, documentId: 919, documentType: "RECEIPT",
      fullNumber: "B001-00000019", status: "DRAFT", environment: "BETA" };
    const longNumber = "F-" + "1234567890".repeat(2) + "12345678";
    const summaries: BillingSummary[] = [absent, receipt,
      { ...receipt, documentId: 920, documentType: "INVOICE", fullNumber: "F001-00000020", status: "ACCEPTED", environment: "PROD" },
      { ...receipt, documentId: 921, documentType: "INVOICE", fullNumber: longNumber, status: "SENT", environment: "LOCAL" },
      { ...receipt, documentId: 922, fullNumber: "B001-00000022", status: "REJECTED" },
      { ...absent, documentId: 923 }];
    await page.setViewportSize({width, height: width > 1100 ? 1000 : 844});
    const state = await setup(page, ["ADMIN"], theme, summaries.length, summaries);
    await page.goto("/ventas?ngsw-bypass=true");
    await expect(page.locator("body")).toHaveAttribute("data-theme", theme);

    const table = page.getByRole("region", {name:"Resultados de ventas"});
    const identities = table.locator(".document-identity");
    const statuses = table.locator(".document-state");
    await expect(identities).toHaveText(["Nota de venta", "Boleta · B001-00000019", "Factura · F001-00000020",
      `Factura · ${longNumber}`, "Boleta · B001-00000022", "Información documental no verificable"]);
    await expect(statuses).toHaveText(["No fiscal · Sin comprobante electrónico", "Borrador · no emitido · Beta · pruebas",
      "Aceptado · Producción", "Resultado por verificar · Local · pruebas", "Rechazado · Beta · pruebas", "Estado no disponible"]);
    await expect(statuses.nth(3)).toHaveAttribute("data-tone", "warning");
    await expect(statuses.nth(4)).toHaveAttribute("data-tone", "danger");
    await expect(table.getByRole("columnheader")).toHaveCount(width > 1100 ? 6 : 4);
    for (const line of await statuses.all()) await verifyTextContrast(line);
    for (const identity of await identities.all()) await verifyTextContrast(identity);

    const reflow = await table.evaluate(region => {
      const lines = Array.from(region.querySelectorAll(".document-identity, .document-state"), element => {
        const cell = element.closest("td")!.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(element);
        const fragments = Array.from(range.getClientRects());
        return { count: fragments.length, fits: fragments.length > 0 && fragments.every(rect =>
          rect.left >= cell.left - 1 && rect.right <= cell.right + 1 && rect.top >= cell.top - 1 && rect.bottom <= cell.bottom + 1) };
      });
      return { lines, tableFits: region.scrollWidth <= region.clientWidth + 1,
        pageFits: document.documentElement.scrollWidth <= window.innerWidth + 1 };
    });
    expect(reflow.lines.every(line => line.fits)).toBe(true);
    expect(reflow.tableFits).toBe(true);
    expect(reflow.pageFits).toBe(true);
    if (width === 1440) expect(reflow.lines.slice(2, 6).map(line => line.count)).toEqual([1, 1, 1, 1]);
    if (width <= 390) expect(reflow.lines[6].count).toBeGreaterThan(1);

    const compactEvidence = path.join(os.tmpdir(), "inktoy-ventas-rd-2", "visual-compact");
    await mkdir(compactEvidence, {recursive:true});
    await page.locator(".sales-page").screenshot({path:path.join(compactEvidence, `list-${width}-${theme}.png`)});

    const firstDetail = table.getByRole("link", {name:`Ver detalle de venta ${state.sale.saleNumber}`, exact:true});
    await table.focus();
    await page.keyboard.press("Tab");
    await expect(firstDetail).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", {name:`Venta ${state.sale.saleNumber}`, exact:true})).toBeVisible();
    await page.getByRole("link", {name:"Volver al listado", exact:true}).click();
    await expect(firstDetail).toBeFocused();
    await verifyNoWrites(state);
  });
}

for(const viewport of [{width:1440,height:1000},{width:1024,height:768},{width:390,height:844}]) for (const theme of ["light", "dark"]) {
  test("sales/detail/context responsive no-write "+viewport.width+" "+theme,async({page})=>{
    await mkdir(evidence,{recursive:true});await page.setViewportSize(viewport);const state=await setup(page, ["ADMIN"], theme, 4);
    await page.goto("/ventas");await expect(page.locator('.sales-page').getByRole("heading",{name:"Ventas",exact:true})).toBeVisible();
    await expect(page.locator("body")).toHaveAttribute("data-theme", theme);
    const noDocument = page.getByRole("row").filter({hasText:"V-SYN-0081"});
    await expect(noDocument.getByText("Nota de venta",{exact:true})).toBeVisible();
    await expect(noDocument.getByText("No fiscal · Sin comprobante electrónico",{exact:true})).toBeVisible();
    await expect(page.getByRole("row").filter({hasText:"V-SYN-0197"})).toContainText("Información documental no verificable");
    await expect(page.getByRole("row").filter({hasText:"V-SYN-0199"})).toContainText("Borrador · no emitido");
    expect(state.queries[0].searchParams.has("from")).toBe(false);
    await page.getByRole("button",{name:"Filtros",exact:true}).click();
    await page.getByLabel("Estado comercial",{exact:true}).selectOption("COMPLETED");
    await page.getByRole("button",{name:"Aplicar filtros",exact:true}).click();await expect(page).toHaveURL(/salesStatus=COMPLETED/);
    await page.getByRole("button",{name:"Filtros",exact:true}).click();
    await expect(page.getByText("Mostrando 1–4 de 4",{exact:true})).toBeVisible();
    const table = page.getByRole("region", { name: "Resultados de ventas" });
    await expect(table.getByRole("columnheader")).toHaveCount(viewport.width > 1100 ? 6 : 4);
    expect(await table.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    await verifyTextContrast(page.locator('.sales-page [aria-current="page"]'));
    await verifyTextContrast(noDocument.getByText("No fiscal · Sin comprobante electrónico",{exact:true}));
    await page.locator(".sales-page").screenshot({path:path.join(evidence,"list-"+viewport.width+"-"+theme+".png")});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
    const detail=page.getByRole("link",{name:"Ver detalle de venta V-SYN-0081",exact:true});await detail.scrollIntoViewIfNeeded();await detail.click();
    await expect(page.getByRole("heading",{name:"Venta V-SYN-0081",exact:true})).toBeVisible();
    await expect(page.getByRole("link",{name:"Crear documento electrónico",exact:true})).toBeVisible();
    await expect(page.getByText("Cuaderno A4 rayado",{exact:true})).toBeVisible();await expect(page.getByText("CATÁLOGO MODIFICADO",{exact:true})).toHaveCount(0);
    const items=page.getByRole('region',{name:'Artículos e importes persistidos',exact:true});
    const lastAmount=items.getByRole('cell',{name:'S/ 9.00',exact:true});await lastAmount.scrollIntoViewIfNeeded();await expect(lastAmount).toBeInViewport();
    await items.evaluate(element=>element.scrollLeft=0);
    const payments = page.getByRole("region", { name: "Pagos registrados" });
    if (viewport.width <= 600) {
      for (const region of [items, payments]) expect(await region.evaluate(
        element => element.scrollWidth <= element.clientWidth + 1,
      )).toBe(true);
      const item = items.getByRole("row").filter({hasText:"Lápices de color"});
      const payment = payments.getByRole("row").filter({hasText:"Transferencia"});
      for (const label of ["Cantidad", "Precio unitario", "Descuento", "Importe histórico"]) {
        await expect(item.getByText(label, {exact:true})).toBeVisible();
      }
      for (const label of ["Método", "Importe", "Referencia", "Fecha"]) {
        await expect(payment.getByText(label, {exact:true})).toBeVisible();
      }
      for (const value of ["1.25", "S/ 8.00", "S/ 1.00", "S/ 9.00"]) {
        await expect(item.getByRole("cell", {name:value,exact:true})).toBeVisible();
      }
      await expect(payment.getByRole("cell", {name:"REF-SINTETICA-0081",exact:true})).toBeVisible();
      await expect(payment.getByRole("cell", {name:"S/ 3.00",exact:true})).toBeVisible();
      await expect(payment.getByRole("cell", {name:/27\/10\/2026.*21:20/})).toBeVisible();
      await verifyTextContrast(item.getByText("Importe histórico", {exact:true}));
      const catalog = item.locator("summary");
      await catalog.focus(); await expect(catalog).toBeFocused(); await page.keyboard.press("Enter");
      await expect(item.locator("details")).toHaveAttribute("open", "");
      await page.keyboard.press("Enter");
      await page.locator("article[aria-labelledby='items-title']").screenshot({path:path.join(evidence,"articulos-"+theme+".png")});
      await page.locator("article[aria-labelledby='payments-title']").screenshot({path:path.join(evidence,"pagos-"+theme+".png")});
    } else {
      await expect(items.getByRole("columnheader")).toHaveCount(5);
      await expect(payments.getByRole("columnheader")).toHaveCount(4);
    }
    await page.locator(".sale-detail-page").screenshot({path:path.join(evidence,"detail-"+viewport.width+"-"+theme+".png")});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
    await page.getByRole("link",{name:"Estado del comprobante",exact:true}).click();await expect(page).toHaveURL(/ventas\/81\?.*#sale-documents/);
    await page.screenshot({path:path.join(evidence,"detail-documents-"+viewport.width+"-"+theme+".png")});
    await page.getByRole("link",{name:"Anular venta",exact:true}).click();
    await expect(page.getByRole("button",{name:"Confirmar anulación",exact:true})).toBeEnabled();
    const warning = page.locator(".warning-panel p").first();
    const effects = ["V-SYN-0081", "Se repondrán las cantidades vendidas al inventario", "cálculo de su sesión de caja",
      "Los pagos históricos se conservan", "no realiza reembolsos automáticos ni anula el comprobante electrónico"];
    for (const phrase of effects) await expect(warning).toContainText(phrase);
    await verifyTextContrast(warning);
    await page.locator(".sale-void-page").screenshot({path:path.join(evidence,"void-"+viewport.width+"-"+theme+".png")});
    await page.getByLabel("Motivo *").fill("Motivo sintético");
    await page.getByRole("button",{name:"Confirmar anulación",exact:true}).click();
    const dialog = page.getByRole("alertdialog",{name:"Anular venta"});
    for (const phrase of effects) await expect(dialog).toContainText(phrase);
    if (viewport.width === 390) await dialog.screenshot({path:path.join(evidence,"confirmacion-390-"+theme+".png")});
    await expect(dialog.getByRole("button",{name:"Cancelar",exact:true})).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("button",{name:"Confirmar anulación",exact:true})).toBeEnabled();
    await page.getByRole("link",{name:"Volver al detalle",exact:true}).click();
    await page.getByRole("link",{name:"Volver al listado",exact:true}).click();
    await expect(detail).toBeFocused();
    await page.getByRole("button",{name:"Filtros",exact:true}).click();
    await expect(page.getByLabel("Estado comercial",{exact:true})).toHaveValue("COMPLETED");
    await verifyNoWrites(state);
  });
}

for (const viewport of [{width:1440,height:1000}, {width:1024,height:768}, {width:390,height:844}]) {
  for (const theme of ["light", "dark"]) {
    test(`void dialog focus and safe cancellation ${viewport.width} ${theme}`, async ({page}) => {
      await page.setViewportSize(viewport);
      const state = await setup(page, ["ADMIN"], theme);
      await page.goto("/ventas/81/anular?ngsw-bypass=true");
      await expect(page.locator("body")).toHaveAttribute("data-theme", theme);
      const trigger = page.getByRole("button", {name:"Confirmar anulación", exact:true});
      const dialog = page.getByRole("alertdialog", {name:"Anular venta"});
      const cancel = dialog.getByRole("button", {name:"Cancelar", exact:true});
      const destructive = dialog.getByRole("button", {name:"Anular", exact:true});
      await page.getByLabel("Motivo *").fill("Motivo sintético");

      await trigger.click();
      await expect(trigger).toBeDisabled();
      await expect(cancel).toBeFocused();
      await expect(destructive).toHaveClass(/ui-button--danger/);
      await page.keyboard.press("Shift+Tab");
      await expect(destructive).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(cancel).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(trigger).toBeEnabled();
      await expect(trigger).toBeFocused();

      await page.keyboard.press("Enter");
      await expect(cancel).toBeFocused();
      await cancel.click();
      await expect(dialog).toHaveCount(0);
      await expect(trigger).toBeEnabled();
      await expect(trigger).toBeFocused();
      await verifyNoWrites(state);
    });
  }
}

test("void dialog focus falls back to the heading when the session changes", async ({page}) => {
  const state = await setup(page);
  await page.goto("/ventas/81/anular?ngsw-bypass=true");
  const trigger = page.getByRole("button", {name:"Confirmar anulación", exact:true});
  const dialog = page.getByRole("alertdialog", {name:"Anular venta"});
  await page.getByLabel("Motivo *").fill("Motivo sintético");
  await trigger.click();
  await expect(dialog.getByRole("button", {name:"Cancelar", exact:true})).toBeFocused();
  await page.evaluate(() => {
    localStorage.setItem("erp_pos_token", "synthetic-second-actor");
    window.dispatchEvent(new StorageEvent("storage", {key:"erp_pos_token"}));
  });
  await expect(page.getByRole("alert")).toContainText("La sesión cambió");
  await expect(trigger).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("heading", {name:"Anular venta", exact:true})).toBeFocused();
  await verifyNoWrites(state);
});

test("document shortcut reaches its offscreen target with mouse and keyboard without writes",async({page})=>{
  await page.setViewportSize({width:1440,height:768});
  const state=await setup(page);
  state.sale.items.push(...Array.from({length:12},(_,index)=>({...state.sale.items[0],id:index+3,productId:index+3,
    productNameSnapshot:"Artículo sintético adicional "+(index+3),quantity:1,quantityText:"1",unitPrice:0,discountAmount:0,lineTotal:0})));
  await page.goto("/ventas/81?salesStatus=COMPLETED&salesCash=7");
  await expect(page.getByText("Sin comprobante electrónico registrado",{exact:true})).toBeVisible();
  const shortcut=page.getByRole("link",{name:"Estado del comprobante",exact:true});
  const heading=page.getByRole("heading",{name:"Comprobante electrónico",exact:true});
  await shortcut.scrollIntoViewIfNeeded();await expect(heading).not.toBeInViewport();
  await shortcut.click();await expect(heading).toBeInViewport({ratio:1});await expect(heading).toBeFocused();
  await expect(page).toHaveURL(/salesStatus=COMPLETED&salesCash=7#sale-documents$/);
  // A second activation must also work when the fragment is already current.
  await shortcut.focus();await shortcut.scrollIntoViewIfNeeded();await expect(heading).not.toBeInViewport();
  await page.keyboard.press("Enter");await expect(heading).toBeInViewport({ratio:1});await expect(heading).toBeFocused();
  await mkdir(evidence,{recursive:true});await page.locator("#sale-documents").screenshot({path:path.join(evidence,"document-shortcut-target.png")});
  await page.getByRole("link",{name:"Volver al listado",exact:true}).click();
  await page.getByRole("button",{name:"Filtros",exact:true}).click();
  await expect(page.getByLabel("Estado comercial",{exact:true})).toHaveValue("COMPLETED");
  await expect(page.getByLabel("Sesión de caja",{exact:true})).toHaveValue("7");
  await verifyNoWrites(state);
});
test("document failure is not absence; retry and fiscal states keep conservative actions",async({page})=>{
  const state=await setup(page);state.documents({message:"synthetic"},500);
  const release = state.holdDocument();
  await page.goto("/ventas/81?salesCash=7");
  await expect(page.getByText("Consultando documento electrónico…",{exact:true})).toBeVisible();
  await expect(page.getByText("Sin comprobante electrónico registrado",{exact:true})).toHaveCount(0);
  release();
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
    await expect(page).toHaveURL(/dashboard/);await expect(page.getByRole("heading",{name:"Venta V-SYN-0081",exact:true})).toHaveCount(0);
    expect(state.reads()).toBe(0);
  } else {
    await expect(page.getByRole("link",{name:"Crear documento electrónico",exact:true})).toBeVisible();
    await expect(page.getByRole("link",{name:"Anular venta",exact:true})).toHaveCount(role==="CAJERO"?0:1);
  }
  await verifyNoWrites(state);
});
test("keyboard and note return preserve the list context without a commercial write",async({page})=>{
  const state=await setup(page);await page.goto("/ventas/81?salesCash=7");
  await expect(page.getByRole("heading",{name:"Venta V-SYN-0081",exact:true})).toBeFocused();
  await page.keyboard.press("Tab");await expect(page.getByRole("link",{name:"Volver al listado",exact:true})).toBeFocused();
  await page.getByRole("link",{name:"Ver nota de venta",exact:true}).click();
  await expect(page.getByRole("heading",{name:"NOTA DE VENTA",exact:true})).toBeVisible();
  await page.getByRole("link",{name:"Volver al detalle",exact:true}).click();
  await page.getByRole("link",{name:"Volver al listado",exact:true}).click();
  await page.getByRole("button",{name:"Filtros",exact:true}).click();
  await expect(page.getByLabel("Sesión de caja",{exact:true})).toHaveValue("7");
  await verifyNoWrites(state);
});

test("exact search, combined prefix filters, real page sizes and note return use the v2 query", async ({ page }) => {
  const state = await setup(page, ["SUPERVISOR"], "light", 48);
  await page.goto("/ventas");
  await expect(page.getByText("Mostrando 1–20 de 48", { exact: true })).toBeVisible();
  const search = page.getByLabel("Número de venta", { exact: true });
  await search.fill(state.sale.saleNumber);
  expect(state.queries).toHaveLength(1);
  await search.press("Enter");
  await expect(page.getByText("Mostrando 1–1 de 1", { exact: true })).toBeVisible();
  expect(state.queries.at(-1)!.searchParams.get("saleNumber")).toBe(state.sale.saleNumber);
  await page.getByLabel("Modo de búsqueda").selectOption("prefix");
  await search.fill("V-");
  await search.press("Enter");
  await expect(page.getByRole("alert")).toContainText("El prefijo debe tener");
  await search.fill("V-SYN");
  await page.getByRole("button", { name: "Filtros", exact: true }).click();
  await page.getByLabel("Estado comercial", { exact: true }).selectOption("COMPLETED");
  await page.getByLabel("Presencia de documento").selectOption("true");
  await page.getByLabel("Estado documental", { exact: true }).selectOption("DRAFT");
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(page).toHaveURL(/salesDocumentStatus=DRAFT/);
  await expect.poll(() => state.queries.at(-1)?.searchParams.get("documentStatus")).toBe("DRAFT");
  const filters = state.queries.at(-1)!.searchParams;
  expect(filters.get("saleNumberPrefix")).toBe("V-SYN");
  expect(filters.get("status")).toBe("COMPLETED");
  expect(filters.get("hasElectronicDocument")).toBe("true");
  await page.getByLabel("Presencia de documento").selectOption("false");
  await expect(page.getByLabel("Estado documental", { exact: true })).toBeDisabled();
  await expect(page.getByLabel("Estado documental", { exact: true })).toHaveValue("");
  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  await expect(page.getByText("Mostrando 1–20 de 48", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Página 2", exact: true }).click();
  await expect(page.getByText("Mostrando 21–40 de 48", { exact: true })).toBeVisible();
  await expect(page.getByText("Página 2 de 3", { exact: true })).toBeVisible();
  const detail = page.getByRole("link", { name: "Ver detalle de venta V-SYN-0081", exact: true });
  await detail.click();
  await expect(page).toHaveURL(/ventas\/81\?salesPage=1/);
  await page.getByRole("link", { name: "Ver nota de venta" }).click();
  await expect(page.getByRole("heading", { name: "NOTA DE VENTA", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Volver al detalle" }).click();
  await page.getByRole("link", { name: "Volver al listado" }).click();
  await expect(page.getByText("Página 2 de 3", { exact: true })).toBeVisible();
  await expect(detail).toBeFocused();
  await page.reload();
  await expect(page.getByText("Página 2 de 3", { exact: true })).toBeVisible();
  await page.getByLabel("Por página").selectOption("50");
  await expect(page.getByText("Mostrando 1–48 de 48", { exact: true })).toBeVisible();
  expect(state.queries.at(-1)!.searchParams.get("size")).toBe("50");
  await page.getByLabel("Por página").selectOption("100");
  await expect.poll(() => state.queries.at(-1)?.searchParams.get("size")).toBe("100");
  await page.goBack();
  await expect(page.getByLabel("Por página")).toHaveValue("50");
  await page.goForward();
  await expect(page.getByLabel("Por página")).toHaveValue("100");
  await expect(page.getByRole("button", { name: "Actualizar resultados" })).toBeEnabled();
  const refreshed = state.queries.length;
  await page.getByRole("button", { name: "Actualizar resultados" }).click();
  await expect.poll(() => state.queries.length).toBe(refreshed + 1);
  await verifyNoWrites(state);
});

test("quick dates use Lima and late rows are withdrawn on credential change", async ({ page }) => {
  const state = await setup(page, ["ADMIN", "CAJERO"]);
  await page.clock.setFixedTime(new Date("2033-01-01T04:59:59Z"));
  await page.goto("/ventas?salesUser=other");
  await expect(page.getByRole("heading", { name: "Mis ventas", exact: true })).toBeVisible();
  await expect(page.getByText("Mostrando 1–1 de 1", { exact: true })).toBeVisible();
  expect(state.queries[0].searchParams.has("createdBy")).toBe(false);
  await page.getByRole("button", { name: "Hoy", exact: true }).click();
  await expect.poll(() => state.queries.at(-1)?.searchParams.get("from")).toBe("2032-12-31");
  await expect(page.getByRole("button", { name: "Actualizar resultados" })).toBeEnabled();
  const held = state.holdList();
  await page.getByRole("button", { name: "Actualizar resultados" }).click();
  await held.ready;
  await page.evaluate(() => {
    localStorage.setItem("erp_pos_token", "synthetic-second-actor");
    window.dispatchEvent(new Event("storage"));
  });
  held.release();
  await expect(page.getByRole("alert")).toContainText("La sesión cambió");
  await expect(page.getByRole("table")).toHaveCount(0);
  await expect(page.getByText("V-SYN-0081", { exact: true })).toHaveCount(0);
  await verifyNoWrites(state);
});
