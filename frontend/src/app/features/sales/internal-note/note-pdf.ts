import type { Content, ContentCanvas, ContentSection, NodeStartPosition, TableCell, TDocumentDefinitions } from "pdfmake/interfaces";
import { InternalNote, NOTE_CONFIG, NOTE_PROFILES, NoteFormat, NoteLine } from "./note-model";

function totals(note: InternalNote, ticket: boolean): Content {
  const body: TableCell[][] = [];
  const append = (label: string, value: string, size = ticket ? 9 : 9.5): void => {
    if (ticket && value.replace(/^S\/\s*/, '').length > 9) {
      body.push([{text:label,colSpan:2},{}],[{text:value,colSpan:2,noWrap:true,fontSize:size},{}]);
    } else body.push([{text:label,fontSize:size},{text:value,fontSize:size,noWrap:true}]);
  };
  append('Subtotal',note.subtotal); append('Descuento',note.discount); append('TOTAL',note.total,ticket ? 12 : 16);
  note.payments.forEach(payment=>append(payment.method,payment.amount)); append('Pagado',note.paid); append('VUELTO',note.change,ticket ? 11 : 12);
  return { unbreakable:true,margin:[0,12,0,8],table:{widths:['*','auto'],body},layout:'lightHorizontalLines' };
}
function description(line: NoteLine): Content[] {
  const name = line.name;
  // Keep ordinary words intact; add character wrapping only to an otherwise unbreakable run.
  const text = /\S{16,}/.test(name) ? name.split(/(\S{16,})/).filter(Boolean).map(part =>
    ({text:part,wordBreak:/^\S{16,}$/.test(part) ? "break-all" as const : "normal" as const})) : name;
  return [{ text },
    ...(line.source ? [{ text: line.source, fontSize: 8.5, italics: true } as Content] : [])];
}
function longNumber(line: NoteLine): boolean {
  return line.quantity.length > 7 || [line.price,line.discount,line.total].some(value => value.replace(/^S\/\s*/, "").length > 9);
}
function numericContinuation(line: NoteLine): Content[] {
  return [["Cantidad",line.quantity],["Descuento",line.discount],["Precio unitario",line.price],["Importe",line.total]]
    .flatMap(([label,value]) => [{ text: label, fontSize: 8.5 }, { text: value, noWrap: true }]);
}
function ticketRows(line: NoteLine, format: "ticket58" | "ticket80"): TableCell[][] {
  const narrow = format === "ticket58";
  // User-selected display label; sale detail does not expose a historical unit of measure.
  const unit = "UND.";
  const monetaryLength = (value: string): number => value.replace(/^S\/\s*/, "").length;
  const needsContinuation = line.quantity.length > (narrow ? 5 : 8)
    || monetaryLength(line.price) > (narrow ? 5 : 9) || monetaryLength(line.total) > (narrow ? 5 : 9);
  const spanning = (stack: Content[], margin: [number,number,number,number]): TableCell[] =>
    [{colSpan:4,stack,margin},{},{},{}];
  const rows: TableCell[][] = [spanning(description(line),[0,6,0,2])];
  if (needsContinuation) rows.push(spanning(
    [["Cantidad",line.quantity],["Unidad",unit],["Precio unitario",line.price],["Total",line.total]].flatMap(([label,value]) =>
      [{text:label,fontSize:8},{text:value,noWrap:true}]),[0,0,0,6]));
  else rows.push([
    {text:line.quantity,noWrap:true,alignment:"right",margin:[0,2,0,6]},
    {text:unit,noWrap:true,alignment:"center",margin:[0,2,0,6]},
    {text:line.price,noWrap:true,alignment:"right",margin:[0,2,0,6]},
    {text:line.total,noWrap:true,alignment:"right",margin:[0,2,0,6]},
  ]);
  if (line.hasDiscount) rows.push(spanning(monetaryLength(line.discount) > (narrow ? 6 : 9)
    ? [{text:"Descuento",fontSize:8.5},{text:line.discount,noWrap:true}]
    : [{text:`Descuento: ${line.discount}`,fontSize:8.5,noWrap:true}],[0,0,0,6]));
  return rows;
}
function ticketProducts(note: InternalNote, section: number, format: "ticket58" | "ticket80"): Content {
  const p = NOTE_PROFILES[format], narrow = format === "ticket58", padding = 1.5;
  const body: TableCell[][] = [
    (narrow ? ["Cant.","Unid.","P. Unit.","Total"] : ["Cantidad","Unidad","P. Unitario","Total"])
      .map((text,column):TableCell=>({text,fontSize:narrow?7:8,noWrap:true,alignment:column===1?"center":"right",margin:[0,0,0,5]})),
  ];
  const ends = new Set<number>();
  note.lines.slice(section*20,section*20+20).forEach(line=>{
    body.push(...ticketRows(line,format)); ends.add(body.length);
  });
  const ratios=narrow?[.21,.17,.31,.31]:[.21,.16,.315,.315];
  return {table:{widths:ratios.map(ratio=>(p.width-2*p.margin)*ratio-2*padding),headerRows:1,dontBreakRows:true,body},
    layout:{hLineWidth:index=>index===1?1.5:ends.has(index)?0.5:0,vLineWidth:()=>0,hLineColor:index=>index===1?'#000000':'#aaaaaa',
      paddingLeft:()=>padding,paddingRight:()=>padding,paddingTop:()=>0,paddingBottom:()=>0}};
}
function closing(note: InternalNote, ticket: boolean, generated: string): Content {
  return { unbreakable: true, stack: [totals(note,ticket), { text: NOTE_CONFIG.thanks, margin: [0, 8, 0, 4] },
    { text: `Generada: ${generated}`, fontSize: 8, margin: [0,4,0,0] },
    ...(note.status === "VOIDED" ? [{ text: `ANULADA${note.voidedDate ? ' · '+note.voidedDate : ''} · Importes originales conservados.`, margin: [0,8,0,0] } as Content] : []),
  ] };
}
function a4Closing(note: InternalNote, generated: string): Content {
  const body: TableCell[][] = [];
  const append=(label:string,value:string,size=9):void=>{
    if(value.replace(/^S\/\s*/,'').length>9) body.push(
      [{text:label,colSpan:2,fontSize:8},{}],[{text:value,colSpan:2,fontSize:size,noWrap:true,alignment:'right'},{}]);
    else body.push([{text:label,fontSize:size},{text:value,fontSize:size,noWrap:true,alignment:'right'}]);
  };
  append('Subtotal',note.subtotal);append('Descuento',note.discount);append('TOTAL',note.total,11);
  note.payments.forEach(payment=>append(payment.method,payment.amount));append('Pagado',note.paid);append('VUELTO',note.change,10);
  const width=NOTE_PROFILES.a4.width-2*NOTE_PROFILES.a4.margin, summary=50*72/25.4;
  return {unbreakable:true,table:{widths:[width-summary-.9,summary-.9],dontBreakRows:true,body:[[
    {stack:[{text:NOTE_CONFIG.thanks,fontSize:9,margin:[0,0,0,8]},
      {text:`Generada: ${generated}`,fontSize:7.5},
      ...(note.status==='VOIDED'?[{text:`ANULADA${note.voidedDate?' · '+note.voidedDate:''} · Importes originales conservados.`,fontSize:8,margin:[0,10,0,0]} as Content]:[])],margin:[8,10,8,10]},
    {table:{widths:['*','auto'],body},layout:{hLineWidth:index=>index===2?1:0.4,vLineWidth:()=>0,hLineColor:()=> '#000000',paddingLeft:()=>5,paddingRight:()=>5,paddingTop:()=>3,paddingBottom:()=>3}},
  ]]},layout:{hLineWidth:()=>.6,vLineWidth:()=>.6,hLineColor:()=> '#000000',vLineColor:()=> '#000000',
    paddingLeft:()=>0,paddingRight:()=>0,paddingTop:()=>0,paddingBottom:()=>0}};
}
// Zero-height, invisible anchors expose final positions through pdfmake's public layout callback.
function cornerAnchor(id: string, marginBottom=0): ContentCanvas & {id:string} {
  return {id:`a4.corner.${id}`,margin:[0,0,0,marginBottom],canvas:[{type:'line',x1:0,y1:0,x2:0,y2:0,lineWidth:.01,strokeOpacity:0}]};
}
function roundA4Frames(stream: PDFKit.PDFDocument, anchors: Map<string,NodeStartPosition>): void {
  const position=(id:string):NodeStartPosition=>{
    const result=anchors.get(`a4.corner.${id}`);
    if(!result)throw new Error('No se pudo preparar el contorno del documento.');
    return result;
  };
  const corner=(page:number,x:number,y:number,inwardX:number,inwardY:number,stroke:number):void=>{
    const radius=3,k=.5522847498,outside=stroke+.25,overlap=1;
    stream.switchToPage(page-1);stream.save().opacity(1);
    // Replace only the original corner; text, interior rules and page geometry remain untouched.
    stream.rect(inwardX>0?x-outside:x-radius,inwardY>0?y-outside:y-radius,radius+outside,radius+outside).fill('#ffffff');
    stream.lineWidth(stroke).strokeColor('#000000').path(
      `M ${x} ${y+inwardY*(radius+overlap)} L ${x} ${y+inwardY*radius} C ${x} ${y+inwardY*radius*(1-k)} ${x+inwardX*radius*(1-k)} ${y} ${x+inwardX*radius} ${y} L ${x+inwardX*(radius+overlap)} ${y}`).stroke();
    stream.restore();
  };
  const width=NOTE_PROFILES.a4.width-2*NOTE_PROFILES.a4.margin;
  for(const [id,frameWidth,stroke] of [['identity',210,.8],['meta',width,.6]] as const) {
    const start=position(id+'.start'),end=position(id+'.end');
    if(start.pageNumber!==end.pageNumber)throw new Error('El recuadro de cabecera excede su página.');
    for(const side of [1,-1]) {
      const x=start.left+(side>0?stroke/2:frameWidth-stroke/2);
      corner(start.pageNumber,x,start.top+stroke/2,side,1,stroke);
      corner(end.pageNumber,x,end.top-stroke/2,side,-1,stroke);
    }
  }
  const products=position('products.start'),productsEnd=position('products.end'),summaryEnd=position('summary.end');
  for(let page=products.pageNumber;page<=productsEnd.pageNumber;page++)for(const side of [1,-1]) {
    corner(page,products.left+(side>0?0.3:width-.3),(page===products.pageNumber?products.top:NOTE_PROFILES.a4.margin)+.3,side,1,.6);
  }
  for(const side of [1,-1])corner(summaryEnd.pageNumber,summaryEnd.left+(side>0?0.3:width-.3),summaryEnd.top-.3,side,-1,.6);
  const pages=stream.bufferedPageRange();stream.switchToPage(pages.start+pages.count-1);
}
export function noteDefinition(note: InternalNote, format: NoteFormat, logo: string, anchors=new Map<string,NodeStartPosition>()): TDocumentDefinitions {
  const p = NOTE_PROFILES[format], ticket = format !== "a4", cancelled = note.status === "VOIDED";
  const status = cancelled ? "ANULADA" : "REGISTRADA";
  const generated = new Intl.DateTimeFormat('es-PE',{dateStyle:'short',timeStyle:'short',timeZone:'America/Lima'}).format(new Date()) + ' · Lima';
  const meta: Content[] = [{ text: note.date, margin: [0,0,0,10] }];
  const common: TDocumentDefinitions = { content: [], defaultStyle: { font: NOTE_CONFIG.font, fontSize: ticket ? 9 : 9.5, color: NOTE_CONFIG.color, bold: false },
    info: { title: `${NOTE_CONFIG.heading} ${note.number}${cancelled ? ' ANULADA' : ''}`, author: NOTE_CONFIG.tradeName } };
  if (ticket) {
    const count = Math.max(1,Math.ceil(note.lines.length/20));
    return { ...common, pageSize: { width:p.width,height:'auto' }, pageMargins:[p.margin,12,p.margin,12],
      content: Array.from({length:count},(_,section): ContentSection => ({
        pageSize:{width:p.width,height:'auto'},pageMargins:[p.margin,12,p.margin,12],header:null,footer:null,
        section: [
          {image:logo,fit:[format === "ticket58" ? 110 : 128,48],alignment:"center",margin:[0,0,0,7]},
          {text:NOTE_CONFIG.heading,margin:[0,5,0,2]}, {text:note.number,fontSize:11},
          ...(cancelled ? [{text:"ANULADA",margin:[0,4,0,4]} as Content] : []),
          ...(count > 1 ? [{text:`${section ? 'Continuación · ' : ''}${section+1} / ${count}`,fontSize:8,margin:[0,4,0,4]} as Content] : []),
          ...(cancelled && note.voidedDate ? [{text:`Anulada: ${note.voidedDate}`,fontSize:8}] : []),
          ...(section === 0 ? [...(NOTE_CONFIG.contact ? [{text:NOTE_CONFIG.contact}] : []), ...meta] : []),
          ticketProducts(note,section,format),
          ...(section===count-1 ? [closing(note,true,generated)] : [{text:'Continúa en la siguiente sección.',fontSize:8,margin:[0,8,0,0]} as Content]),
          ...(count > 1 ? [{text:`${cancelled ? 'ANULADA · ' : ''}${note.number} · ${section+1} / ${count}`,fontSize:8,alignment:'center',margin:[0,10,0,0]} as Content] : []),
        ],
      })),
    };
  }
  const rows: TableCell[][] = note.lines.map((line): TableCell[] => longNumber(line) ? [
    { colSpan:5,unbreakable:true,stack:[...description(line),...numericContinuation(line)] },{},{},{},{},
  ] : [
    {text:line.quantity,alignment:'right',noWrap:true},
    {stack:description(line)},{text:line.discount,alignment:'right',noWrap:true},
    {text:line.price,alignment:'right',noWrap:true}, {text:line.total,alignment:'right',noWrap:true},
  ]);
  const fields: TableCell[]=[{stack:[{text:'FECHA DE VENTA',fontSize:7,margin:[0,0,0,4]},{text:note.date,fontSize:8.5}]}];
  if(note.payments.length) fields.push({stack:[{text:'MEDIOS DE PAGO',fontSize:7,margin:[0,0,0,4]},
    {text:[...new Set(note.payments.map(payment=>payment.method))].join(' · '),fontSize:8.5}]});
  if(cancelled && note.voidedDate) fields.push({stack:[{text:'FECHA DE ANULACIÓN',fontSize:7,margin:[0,0,0,4]},{text:note.voidedDate,fontSize:8.5}]});
  // Leave the same writing area as a paper form for short documents; extensive sales flow naturally.
  const formHeight=note.lines.length>0 && note.lines.length<=3 && note.payments.length<=3
    && note.lines.every(line=>line.name.length<=80 && !line.source && !longNumber(line)) ? 420-(note.lines.length-1)*21 : 0;
  return { ...common,pageSize:{width:p.width,height:p.height},pageMargins:[p.margin,p.margin,p.margin,p.margin],
    pageBreakBefore:node=>{if(node.id?.startsWith('a4.corner.'))anchors.set(node.id,{...node.startPosition});return false;},
    header: page => page > 1 ? {text:`${NOTE_CONFIG.heading} · ${note.number} · ${status}`,fontSize:8.5,margin:[p.margin,16,p.margin,0]} : null,
    footer:(page,pages)=>({text:`${cancelled ? 'ANULADA · ' : ''}Página ${page} de ${pages}`,fontSize:8.5,alignment:'center',margin:[p.margin,16,p.margin,0]}),
    content:[
      {columns:[{width:'*',stack:[
        // Compensate for the approved image's white surround without changing its pixels.
        {image:logo,fit:[240,120],margin:[-30,-15,0,-20]},...(NOTE_CONFIG.contact?[{text:NOTE_CONFIG.contact,fontSize:8}]:[])]},
        {width:210,stack:[cornerAnchor('identity.start'),{table:{widths:[188.4],body:[[{stack:[{text:NOTE_CONFIG.heading,fontSize:11,margin:[0,4,0,12]},
          {text:note.number,fontSize:13,margin:[0,0,0,10]},{text:status,fontSize:9}],alignment:'center'}]]},
          layout:{hLineWidth:()=>.8,vLineWidth:()=>.8,hLineColor:()=> '#000000',vLineColor:()=> '#000000',paddingLeft:()=>10,paddingRight:()=>10,paddingTop:()=>10,paddingBottom:()=>10}},cornerAnchor('identity.end')]}],
        columnGap:16,margin:[0,0,0,10]},
      cornerAnchor('meta.start'),
      {table:{widths:fields.map(()=>'*'),body:[fields]},layout:{hLineWidth:()=>.6,vLineWidth:()=>.6,hLineColor:()=> '#000000',vLineColor:()=> '#000000',
        paddingLeft:()=>6,paddingRight:()=>6,paddingTop:()=>6,paddingBottom:()=>6}},
      cornerAnchor('meta.end',8),
      cornerAnchor('products.start'),
      {table:{widths:[18,87,25,25,25].map(mm=>mm*72/25.4-10-.72),headerRows:1,dontBreakRows:true,
        heights:index=>formHeight && index===rows.length?formHeight:'auto',
        body:[['CANTIDAD','DESCRIPCIÓN','DESCUENTO','P. UNITARIO','IMPORTE'].map((text,index)=>({text,fontSize:7.5,alignment:index===1?'left':'right'})),...rows]},
        layout:{hLineWidth:index=>index<=1 || index===rows.length+1?0.6:0,vLineWidth:()=>.6,hLineColor:()=> '#000000',vLineColor:()=> '#000000',
          paddingLeft:()=>5,paddingRight:()=>5,paddingTop:()=>5,paddingBottom:()=>5}},
      cornerAnchor('products.end'),a4Closing(note,generated),cornerAnchor('summary.end'),
    ],
  };
}
// Both heavy modules stay behind dynamic imports. No CDN, remote fonts or catalog URLs.
let engine: Promise<typeof import("pdfmake/build/pdfmake")> | undefined;
async function pdfEngine(): Promise<typeof import("pdfmake/build/pdfmake")> {
  engine ??= Promise.all([import("pdfmake/build/pdfmake"), import("pdfmake/build/vfs_fonts")]).then(([pdf, fonts]) => {
    pdf.default.addVirtualFileSystem(fonts.default); return pdf.default;
  }).catch(error => { engine = undefined; throw error; });
  return engine;
}
async function localLogo(thermal: boolean): Promise<string> {
  const response = await fetch(NOTE_CONFIG.logo, { credentials: "omit", cache: "force-cache" });
  if (!response.ok) throw new Error("Logo local no disponible.");
  const blob = await response.blob();
  if (thermal) {
    // Presentation-only copy: preserve the global asset, trim blank surround and render black on white.
    const image = await createImageBitmap(blob);
    const canvas = document.createElement("canvas"); canvas.width=image.width; canvas.height=image.height;
    const context = canvas.getContext("2d");
    if (!context) { image.close(); throw new Error("No se pudo preparar el logo térmico."); }
    context.drawImage(image,0,0); image.close();
    const pixels=context.getImageData(0,0,canvas.width,canvas.height);
    let left=canvas.width, top=canvas.height, right=-1, bottom=-1;
    for(let y=0;y<canvas.height;y++) for(let x=0;x<canvas.width;x++) {
      const offset=(y*canvas.width+x)*4;
      const ink=pixels.data[offset+3]>16 && Math.min(pixels.data[offset],pixels.data[offset+1],pixels.data[offset+2])<235;
      if(ink) { left=Math.min(left,x); top=Math.min(top,y); right=Math.max(right,x); bottom=Math.max(bottom,y); }
      pixels.data[offset]=pixels.data[offset+1]=pixels.data[offset+2]=ink?0:255; pixels.data[offset+3]=255;
    }
    if (right<left || bottom<top) throw new Error("El logo térmico no contiene una marca visible.");
    context.putImageData(pixels,0,0);
    const cropped=document.createElement("canvas"); cropped.width=right-left+7; cropped.height=bottom-top+7;
    const target=cropped.getContext("2d"); if(!target) throw new Error("No se pudo preparar el logo térmico.");
    target.fillStyle="#ffffff"; target.fillRect(0,0,cropped.width,cropped.height);
    target.drawImage(canvas,left,top,right-left+1,bottom-top+1,3,3,right-left+1,bottom-top+1);
    return cropped.toDataURL("image/png");
  }
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob); });
}
export async function generateNote(note: InternalNote, format: NoteFormat, printing = false): Promise<Blob> {
  const [pdf, logo] = await Promise.all([pdfEngine(), localLogo(format !== "a4")]);
  const anchors=new Map<string,NodeStartPosition>();
  const document = pdf.createPdf(noteDefinition(note, format, logo,anchors),format==='a4'?{bufferPages:true}:undefined);
  if(format==='a4')roundA4Frames(await document.getStream(),anchors);
  if (printing) {
    // Same stream operation as 0.3.13 OutputDocumentBrowser.print(), with our own URL lifetime.
    // Its public types omit this pdfmake-specific extension; narrow and verify it at runtime.
    const stream = await document.getStream();
    if (!("setOpenActionAsPrint" in stream) || typeof stream.setOpenActionAsPrint !== "function") {
      throw new Error("La acción de impresión del motor PDF no está disponible.");
    }
    stream.setOpenActionAsPrint();
  }
  return document.getBlob();
}
