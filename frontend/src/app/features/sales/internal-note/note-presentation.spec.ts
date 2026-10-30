import { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import { NOTE_CONFIG, NOTE_PROFILES, toInternalNote } from "./note-model";
import { noteDefinition } from "./note-pdf";
import { noteSale } from "./note-test-data";

function texts(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(texts);
  if (!value || typeof value !== "object") return [];
  const object=value as Record<string,unknown>;
  const own=object['text'];
  return [...(typeof own==='string' ? [own] : Array.isArray(own) ? [own.flatMap(texts).join('')] : []),...Object.entries(object).filter(([key])=>key!=='text').flatMap(([,child])=>texts(child))];
}
function document(count=2, format:'a4'|'ticket80'|'ticket58'='a4', voided=false): TDocumentDefinitions {
  return noteDefinition(toInternalNote(noteSale(count,voided)),format,'LOCAL_APPROVED_LOGO');
}
function expectClean(def: TDocumentDefinitions): void {
  const visible=texts(def.content).join('\n');
  expect(visible).toContain('NOTA DE VENTA'); expect(visible).toContain('V-SYN-0081'); expect(visible).toContain('27 oct. 2026');
  for(const prohibited of ['SKU','INK-SYN-','CURRENT','cajero.sintetico','Cajero:','Caja #','Almacén','Documento interno','No es comprobante','NOTA DE VENTA INTERNA','NEVER_EXPORT']) expect(visible).not.toContain(prohibited);
}
describe('Final note presentation (seven authorized adjustments)',()=>{
  it('keeps all document text regular black, including voided states, continuations, headers and footers',()=>{
    const inspect=(value:unknown):void=>{
      if(Array.isArray(value))return value.forEach(inspect);
      if(!value || typeof value!=='object')return;
      for(const [key,child] of Object.entries(value)) {
        if(key==='bold')expect(child).toBe(false);
        if(key==='color')expect(child).toBe('#000000');
        inspect(child);
      }
    };
    expect(NOTE_CONFIG.color).toBe('#000000');
    for(const format of ['a4','ticket58','ticket80'] as const)for(const voided of [false,true]) {
      const def=document(41,format,voided);expect(def.defaultStyle?.bold).toBe(false);expect(def.defaultStyle?.color).toBe('#000000');
      inspect(def);
      for(const key of ['header','footer'] as const)if(typeof def[key]==='function') {
        const callback=def[key] as unknown as (page:number,pages:number)=>unknown;inspect(callback(2,3));
      }
      expect(JSON.stringify(def.content)).toContain('LOCAL_APPROVED_LOGO');
    }
  });
  it('removes display-only SKU and operational data from the allow list while preserving REST input and money',()=>{
    const sale=noteSale();const original=structuredClone(sale), note=toInternalNote(sale);
    expect(sale).toEqual(original); expect(sale.items[0].skuSnapshot).toBe('INK-SYN-001');
    expect('sku' in note.lines[0]).toBe(false); for(const field of ['cashier','cash','warehouse']) expect(field in note).toBe(false);
    expect(note.lines[0].quantity).toBe('0.125'); expect(note.lines[0].price).toContain('20.05'); expect(note.lines[0].total).toContain('24.01');
    expect(note.total).toContain('150.00');expect(note.change).toContain('10.00'); expect(note.payments.map(p=>p.amount)).toEqual(['100.00','60.00'].map(value=>new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(Number(value))));
  });
  it('preserves captured names and explicitly labels a current catalog name without exposing SKU',()=>{
    const sale=noteSale(2); sale.items[1].productNameSnapshot=null;sale.items[1].skuSnapshot=null;
    sale.items[0].productNameSnapshot='12. Acuarelas escolares';
    const note=toInternalNote(sale);expect(note.lines[0].name).toBe(sale.items[0].productNameSnapshot!);
    expect(note.lines[1].name).toBe('CATÁLOGO MODIFICADO');expect(note.lines[1].source).toContain('catálogo actual');expect(note.lines[1].source).not.toContain('SKU');
    for(const format of ['a4','ticket58','ticket80'] as const) {
      const def=noteDefinition(note,format,'LOCAL_APPROVED_LOGO');expectClean(def);
      expect(texts(def.content)).toContain('12. Acuarelas escolares');
    }
  });
  it('keeps A4 discount in its own column between description and unit price with original values only',()=>{
    expect(NOTE_CONFIG.heading).toBe('NOTA DE VENTA'); const def=document();expectClean(def);
    const visible=texts(def.content);expect(visible.join(' ')).toContain('24.01');
    expect(visible).toContain('FECHA DE VENTA');expect(visible).toContain('MEDIOS DE PAGO');
    for(const absent of ['RUC','DNI','IGV','BOLETA','FACTURA','Orden de Compra','Vendedor','Dirección'])expect(visible.join(' ')).not.toContain(absent);
    const blocks=def.content as unknown as {table?:{body:Record<string,unknown>[][];headerRows?:number};layout?:{vLineWidth?:()=>number}}[];
    const grid=blocks.find(block=>block.table?.headerRows===1)!;
    expect(grid.table!.body[0].map(cell=>texts(cell).join(''))).toEqual(['CANTIDAD','DESCRIPCIÓN','DESCUENTO','P. UNITARIO','IMPORTE']);
    expect(grid.layout!.vLineWidth!()).toBeGreaterThan(0);
    const note=toInternalNote(noteSale(2));note.lines.forEach((line,index)=>{
      const row=grid.table!.body[index+1];expect(texts(row[0])).toEqual([line.quantity]);
      expect(texts(row[1])).toEqual([line.name]);expect(texts(row[1]).join(' ')).not.toContain(line.discount);
      expect(texts(row[1]).join(' ')).not.toContain('Descuento:');expect(texts(row[2])).toEqual([line.discount]);
      expect(texts(row[3])).toEqual([line.price]);expect(texts(row[4])).toEqual([line.total]);
      expect(visible.filter(text=>text.includes(line.name)).length).toBe(1);
    });
  });
  it('keeps exceptional A4 quantities and amounts on a full-width continuation without inventing fields',()=>{
    const sale=noteSale(1);sale.items[0].quantityText='9999999999999.999';sale.items[0].unitPrice=9999999999.99;
    const def=noteDefinition(toInternalNote(sale),'a4','LOCAL_APPROVED_LOGO');expectClean(def);
    const visible=texts(def.content);expect(visible).toContain('9999999999999.999');expect(visible).toContain('Precio unitario');
    expect(visible.some(text=>text.includes('9,999,999,999.99'))).toBe(true);expect(JSON.stringify(def.content)).toContain('"colSpan":5');
    expect(visible.indexOf('Descuento')).toBeLessThan(visible.indexOf('Precio unitario'));
  });
  for(const format of ['ticket58','ticket80'] as const) {
    it('renders '+format+' with one four-column header, full-width names above values and no single-section noise',()=>{
      const def=document(2,format);expectClean(def);const visible=texts(def.content).join('\n');
      expect(visible).not.toContain('REGISTRADA');expect(visible).not.toContain('Sección');expect(visible).not.toContain('Continuación');
      expect(texts(def.content)).not.toContain('1 / 1');expect(visible).toContain('Descuento:');
      const sections=def.content as {section:Content[]}[];
      const logo=sections[0].section[0] as {image?:string;alignment?:string};
      expect(logo.image).toBe('LOCAL_APPROVED_LOGO');expect(logo.alignment).toBe('center');
      const productTable=sections[0].section.find(value=>typeof value==='object' && value!==null && 'table' in value) as
        {table:{body:Record<string,unknown>[][]}};
      const body=productTable.table.body, note=toInternalNote(noteSale(2));
      const headers=format==='ticket58'?['Cant.','Unid.','P. Unit.','Total']:['Cantidad','Unidad','P. Unitario','Total'];
      expect(body[0].map(cell=>texts(cell).join(''))).toEqual(headers);
      for(const header of headers)expect(texts(productTable).filter(value=>value===header).length).toBe(1);
      note.lines.forEach(line=>{
        const nameRow=body.findIndex(row=>texts(row[0]).some(text=>text.includes(line.name)));
        expect(nameRow).toBeGreaterThan(0);expect(body[nameRow][0]['colSpan']).toBe(4);
        expect(texts(body[nameRow][0])).toEqual([line.name]);
        expect(body[nameRow+1].map(cell=>texts(cell).join(''))).toEqual([line.quantity,'UND.',line.price,line.total]);
        expect(body[nameRow+1].map(cell=>cell['alignment'])).toEqual(['right','center','right','right']);
        expect(body[nameRow+1].map(cell=>cell['fontSize'] ?? def.defaultStyle?.fontSize)).toEqual([9,9,9,9]);
        expect(texts(body[nameRow+2]).join('')).toContain('Descuento:');
      });
      expect(JSON.stringify(def.content)).not.toContain('×');
      expect(def.pageSize).toEqual({width:NOTE_PROFILES[format].width,height:'auto'});
    });
    it('keeps exceptional '+format+' quantities, prices and amounts intact on labelled continuations',()=>{
      const sale=noteSale(1);sale.items[0].quantityText='9999999999999.999';sale.items[0].unitPrice=9999999999.99;
      const def=noteDefinition(toInternalNote(sale),format,'LOCAL_APPROVED_LOGO');expectClean(def);
      const visible=texts(def.content);expect(visible).toContain('Cantidad');expect(visible).toContain('Unidad');expect(visible).toContain('UND.');expect(visible).toContain('Precio unitario');expect(visible).toContain('Total');expect(visible).toContain('9999999999999.999');
      expect(visible.some(text=>text.includes('9,999,999,999.99'))).toBe(true);expect(visible.some(text=>text.includes('24.01'))).toBe(true);
    });
    it('keeps '+format+' continuation order and annulment in every section without duplicating totals or products',()=>{
      const sale=noteSale(41,true), note=toInternalNote(sale),def=noteDefinition(note,format,'LOCAL_APPROVED_LOGO');expectClean(def);
      const sections=def.content as {section:Content[]}[];expect(sections.length).toBe(3);
      sections.forEach((section,index)=>{const visible=texts(section.section).join('\n');expect(visible).toContain('ANULADA');expect(visible).toContain('Anulada:');expect(visible).toContain(`${index+1} / 3`);});
      const visible=texts(def.content);for(const line of note.lines) expect(visible.filter(text=>text===line.name).length).toBe(1);
      expect(visible.filter(text=>text==='TOTAL').length).toBe(1);expect(visible.filter(text=>text==='VUELTO').length).toBe(1);
    });
  }
});
