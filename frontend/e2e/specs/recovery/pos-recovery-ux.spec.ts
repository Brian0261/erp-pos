import {test,expect,fixture,login,posCart,confirmSale,snapshot,screenshot,usable} from '../../helpers/recovery-commercial';

test('UX 01 modal stacking, ticket controls and focus at four viewport/sidebar configurations',async({page,qa,posts})=>{
  const f=fixture(qa,9);await login(page,f.username);let modal=await posCart(page,f);
  const modes=[['expanded',1366,768],['compact',1366,768],['small',960,720],['mobile',390,844]] as const;
  for(const [name,width,height] of modes){
    if(name!=='expanded'){
      await page.setViewportSize({width,height});
      if(name==='compact')await page.getByRole('button',{name:'Compactar menú lateral',exact:true}).click();
      await page.getByRole('button',{name:'COBRAR',exact:true}).click();modal=page.getByRole('dialog',{name:'Cobrar venta',exact:true});
    }
    await expect(modal).toBeVisible();await expect(page.locator('.layout-shell')).toHaveClass(/has-checkout-modal/);
    if(name==='expanded'){
      // Controlled presentation-only reconstruction of the original stacking defect; no business call.
      const beforeStyle=await page.addStyleTag({content:'.layout-shell > .workspace { z-index: 1 !important; }'});
      try{
        await page.locator('.layout-shell').evaluate(e=>e.classList.remove('has-checkout-modal'));
        await page.locator('.sidebar').evaluate((e:HTMLElement)=>e.inert=false);
        const ticket=modal.getByRole('button',{name:'Ticket interno',exact:true});
        expect(await ticket.evaluate(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return !!hit&&(hit===e||e.contains(hit));})).toBe(false);
        await screenshot(page,'ux01-before-stacking-reconstruction',false);
      }finally{
        await beforeStyle.evaluate(e=>e.remove());
        await page.locator('.layout-shell').evaluate(e=>e.classList.add('has-checkout-modal'));
        await page.locator('.sidebar').evaluate((e:HTMLElement)=>e.inert=true);
      }
    }
    expect(await page.locator('.sidebar').evaluate((e:HTMLElement)=>e.inert)).toBe(true);
    const close=modal.getByRole('button',{name:'Cerrar',exact:true}),pay=modal.getByRole('button',{name:'COBRAR',exact:true});
    await close.focus();
    await expect(close).toBeFocused();await page.keyboard.press('Shift+Tab');await expect(pay).toBeFocused();
    await page.keyboard.press('Tab');await expect(close).toBeFocused();
    await page.locator('.sidebar button').first().evaluate((e:HTMLElement)=>e.focus());await expect(close).toBeFocused();
    await usable(modal.getByRole('heading',{name:'Cobrar venta',exact:true}));
    for(const label of ['Ticket interno','Boleta','Factura'])await usable(modal.getByRole('button',{name:label,exact:true}));
    await usable(modal.getByLabel('Monto *',{exact:true}));await usable(pay);
    expect(await modal.evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight;})).toBe(true);
    await screenshot(page,`ux01-${name}-checkout`,false);
    if(name==='expanded'){
      await pay.click();const confirm=page.getByRole('alertdialog',{name:'Confirmar venta',exact:true});
      await usable(confirm.getByRole('button',{name:'Cancelar',exact:true}));await expect(confirm.getByRole('button',{name:'Cancelar',exact:true})).toBeFocused();
      await page.keyboard.press('Shift+Tab');await expect(confirm.getByRole('button',{name:'Cobrar',exact:true})).toBeFocused();
      await screenshot(page,'ux01-confirmation-above-checkout',false);await confirm.getByRole('button',{name:'Cancelar',exact:true}).click();await expect(pay).toBeFocused();
    }
    await close.click();await expect(modal).toHaveCount(0);await expect(page.locator('.layout-shell')).not.toHaveClass(/has-checkout-modal/);
    expect(await page.locator('.sidebar').evaluate((e:HTMLElement)=>e.inert)).toBe(false);
    await expect(page.getByRole('button',{name:'COBRAR',exact:true})).toBeFocused();
  }
  await page.setViewportSize({width:1366,height:768});await page.getByRole('button',{name:'Ver carrito completo',exact:true}).click();
  const fullCart=page.getByRole('dialog',{name:'Carrito completo',exact:true});await usable(fullCart.getByRole('heading',{name:'Carrito completo',exact:true}));
  await usable(fullCart.getByRole('button',{name:'Cerrar',exact:true}));await screenshot(page,'ux01-other-full-cart-layer',false);await fullCart.getByRole('button',{name:'Cerrar',exact:true}).click();
  expect(posts).toEqual([]);const db=await snapshot(page,9);expect(db.sales).toBe(0);expect(db.payments).toBe(0);expect(db.movements).toBe(0);expect(Number(db.stock)).toBe(100);
});

test('UX 01 uncertain preparation notice stays perceptible in the modal and closing preserves its identity',async({page,qa,posts})=>{
  const f=fixture(qa,10);await login(page,f.username);let id='';
  await page.route('**/api/v1/sales/operations',async route=>{if(route.request().method()!=='POST')return route.continue();
    id=route.request().postDataJSON().operationId;const response=await route.fetch();expect(response.status()).toBe(201);await route.abort('failed');});
  const modal=await posCart(page,f);await confirmSale(page,modal);
  const error=modal.getByRole('alert'),notice=modal.getByRole('status');
  await expect(error).toContainText('No se confirmó la respuesta de preparación');await expect(notice).toContainText('RECUPERAR COBRO');
  await usable(error);await usable(notice);await expect(modal.locator('.checkout-modal__notice')).toBeFocused();
  await usable(modal.getByRole('button',{name:'RECUPERAR COBRO',exact:true}));await screenshot(page,'ux01-uncertain-notice-visible',false);
  const before=await snapshot(page,10,id);expect(before.operation!.state).toBe('PREPARED');expect(before.sales).toBe(0);
  await modal.getByRole('button',{name:'Cerrar',exact:true}).click();expect(await snapshot(page,10,id)).toEqual(before);
  expect(posts.filter(p=>p.path==='/api/v1/sales')).toHaveLength(0);expect(posts.filter(p=>p.path==='/api/v1/sales/operations')).toHaveLength(1);
});
