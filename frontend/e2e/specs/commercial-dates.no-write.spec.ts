import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { noteSale } from '../../src/app/features/sales/internal-note/note-test-data';

for(const zone of ['UTC','America/Lima','Asia/Tokyo']) test.describe(zone,()=>{
  test.use({timezoneId:zone,serviceWorkers:'block'});
  for(const width of [1440,390]) test('Lima dates, navigation, report and KPI '+width,async({page})=>{
    await page.setViewportSize({width,height:900});await page.clock.setFixedTime(new Date(width===1440?'2001-01-01T00:00:00Z':'2042-12-31T23:00:00Z'));
    const token='synthetic-fase3',errors:string[]=[],writes:string[]=[],unexpected:string[]=[],queries:URL[]=[];
    let todayFailure=false, serverDay='2026-10-31', todayReads=0;
    const sale={...noteSale(2),soldAt:'2026-11-01T04:59:59.999999Z',totalAmount:21,status:'COMPLETED'};
    const historic={...sale,id:80,saleNumber:'S-HISTORICAL',soldAt:'2000-01-01T10:00:00Z',totalAmount:999};
    const row={id:sale.id,saleNumber:sale.saleNumber,soldAt:sale.soldAt,status:sale.status,totalAmount:21,createdBy:'qa',cashRegisterSessionId:7,
      billingSummary:{hasElectronicDocument:false,documentId:null,documentType:null,fullNumber:null,status:null,environment:null}};
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(token=>{localStorage.setItem('erp_pos_token',token);localStorage.setItem('erp_pos_theme','dark');},token);
    await page.context().route('**/api/**',async route=>{
      const request=route.request(),url=new URL(request.url());queries.push(url);
      if(request.method()!=='GET'){writes.push(request.method()+' '+url.pathname);return route.abort('blockedbyclient');}
      expect(request.headers()['authorization']).toBe('Bearer '+token);
      if(url.pathname.endsWith('/auth/me'))return route.fulfill({json:{id:'f3-admin',username:'qa',email:'qa@example.invalid',roles:['ADMIN']}});
      if(url.pathname==='/api/v1/sales/list-items'){
        expect(url.searchParams.get('from')).toBe('2026-10-31');expect(url.searchParams.get('to')).toBe('2026-10-31');return route.fulfill({json:[row]});
      }
      if(url.pathname==='/api/v1/sales/81')return route.fulfill({json:sale});
      if(url.pathname==='/api/v1/sales')return route.fulfill({json:[sale,historic]});
      if(url.pathname==='/api/v1/sales/today'){
        todayReads++;expect([...url.searchParams.keys()]).toEqual([]);
        if(todayFailure)return route.fulfill({status:503,json:{message:'Synthetic unavailable'},headers:{'Cache-Control':'no-store'}});
        const current={...sale,soldAt:serverDay==='2026-10-31'?sale.soldAt:'2026-11-01T12:00:00Z'};
        return route.fulfill({headers:{'Cache-Control':'no-store'},json:{businessDate:serverDay,timeZone:'America/Lima',
          referenceInstant:serverDay==='2026-10-31'?'2026-11-01T03:00:00Z':'2026-11-01T12:00:00Z',
          nextDayStartsAt:serverDay==='2026-10-31'?'2026-11-01T05:00:00Z':'2026-11-02T05:00:00Z',
          sales:[current,{...current,id:83,status:'VOIDED',totalAmount:90}]}});
      }
      if(url.pathname==='/api/v1/reports/sales')return route.fulfill({json:{totalSalesAmount:21,totalSalesCount:1,averageTicket:21,voidedSalesCount:1,
        salesByPaymentMethod:[{paymentMethod:'CASH',amount:30}],salesByDay:[{day:'2026-10-31',totalAmount:21,salesCount:1}]}});
      if(url.pathname==='/api/v1/reports/top-products'){
        expect(url.searchParams.has('from')).toBe(false);expect(url.searchParams.has('to')).toBe(false);return route.fulfill({json:[]});
      }
      if(['/api/v1/reports/low-stock','/api/v1/quotes','/api/v1/billing/documents'].includes(url.pathname))return route.fulfill({json:[]});
      if(['/api/v1/inventory/stocks','/api/v1/products'].includes(url.pathname))return route.fulfill({json:{content:[],items:[],totalElements:0,totalItems:0,totalPages:0,page:0,size:1}});
      if(url.pathname==='/api/v1/cash-registers/current')return route.fulfill({status:404,json:{message:'No current session'}});
      unexpected.push(url.pathname);return route.abort('blockedbyclient');
    });
    await page.goto('/ventas?salesFrom=2026-10-31&salesTo=2026-10-31');
    await expect(page.locator('tbody tr')).toHaveCount(1);await expect(page.locator('.date-cell')).toContainText('31/10/2026');
    await page.getByRole('link',{name:'Ver detalle de venta #81',exact:true}).click();
    await expect(page.locator('.sale-head-meta')).toContainText('31/10/2026');
    await page.getByRole('link',{name:'Volver al listado',exact:true}).click();await expect(page.getByLabel('Desde',{exact:true})).toHaveValue('2026-10-31');
    await page.goto('/reportes/ventas');await expect(page.getByText('31/10/2026',{exact:true})).toBeVisible();
    await page.goto('/dashboard');const kpi=page.locator('.kpi-card').filter({hasText:'Ventas del dia'});
    await expect(kpi).toContainText('1 ventas completadas hoy (31/10/2026) · Lima');await expect(kpi.locator('.kpi-value')).toContainText('21.00');
    await expect(page.getByText('Venta S-HISTORICAL',{exact:true})).toBeVisible();
    expect(queries.filter(u=>u.pathname==='/api/v1/sales')).toHaveLength(1);expect(todayReads).toBe(1);
    todayFailure=true;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
    await expect(kpi).toContainText('Ventas de hoy no verificadas');await expect(kpi.locator('.kpi-value')).toHaveText('--');
    todayFailure=false;serverDay='2026-11-01';await kpi.getByRole('button',{name:'Reintentar ventas de hoy',exact:true}).click();
    await expect(kpi).toContainText('01/11/2026');expect(todayReads).toBe(3);
    await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'));});
    await expect(kpi.locator('.kpi-value')).toHaveText('--');
    await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('focus'));});
    await expect(kpi).toContainText('01/11/2026');await expect(kpi.locator('.kpi-value')).toContainText('21.00');expect(todayReads).toBe(4);
    await expect(page.getByText('Venta S-HISTORICAL',{exact:true})).toBeVisible();expect(queries.filter(u=>u.pathname==='/api/v1/sales')).toHaveLength(1);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
    const evidence=path.join(os.tmpdir(),'inktoy-fase3','server-today','visual');await mkdir(evidence,{recursive:true});
    await page.screenshot({path:path.join(evidence,zone.replace('/','-')+'-'+width+'.png'),fullPage:true});
    expect(writes).toEqual([]);expect(unexpected).toEqual([]);expect(errors).toEqual([]);
  });
});
