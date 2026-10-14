const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync('C:/Users/feder/Downloads/computo_obra.html', 'utf8');
const vc = new VirtualConsole(); const err = []; vc.on('jsdomError', e => err.push(String(e.message||e).slice(0,200)));
const dom = new JSDOM(html, {runScripts:'dangerously', pretendToBeVisual:true, url:'http://localhost/', virtualConsole:vc});
const w = dom.window, d = w.document; w.scrollTo=()=>{}; w.HTMLElement.prototype.scrollIntoView=function(){}; w.Element.prototype.scrollTo=function(){}; w.fetch=async()=>({json:async()=>({ok:true})});
const alerts = []; w.alert = m => alerts.push(m); w.confirm = () => true; let nombrePrompt = null; w.prompt = (m, def) => nombrePrompt ?? def;
const leer = (nombre, texto) => new Promise(res => {
  const inp = d.getElementById('proj-import-input');
  Object.defineProperty(inp, 'files', {value: [new w.File([texto], nombre, {type:'application/json'})], configurable:true});
  w.importarArchivoJSON(inp); setTimeout(res, 600);
});
setTimeout(async () => {
  const S = () => w.eval('state'); const out = [];
  const ok = (t, c) => out.push((c ? '✓ ' : '✗ ') + t);
  // 1. plan de obra (como el archivo del usuario)
  alerts.length = 0;
  await leer('obracalc_NAMASTE_I_Marcelico_2026-10-14.json', JSON.stringify({tareas:[{id:1, rubroId:'r2', item:'Excavación', und:'m³', qty:44.98}], rec:[], grupos:[], rubros:[{id:'r2'}], cfg:{}, proyecto:'', cuadGrupos:{}, cuadRubros:{}, moItems:{}, matIncr:{}, imprevistos:0, notaPDF:''}));
  ok('plan de obra → aviso claro "PLAN DE OBRA"', alerts.length===1 && /PLAN DE OBRA/.test(alerts[0]));
  // 2. despiece
  alerts.length = 0;
  const desp = {obra:{nombre:'Departamentos', propietario:'NAMASTE I', ubicacion:'San Juan'}, campos:{'sup-pb':150, 'col-horm-tipo':'H21', 'no-existe':1},
    columnas:[{denom:'C1', nivel:'PB', cantElem:6, secA:20, secB:30, alt:2.8, altT:3.2, phi:12, nBarras:4}, {denom:'C2', cantElem:2}],
    vigas_vf:[{denom:'VF1', longLibre:6, ancho:20, alto:40}], vigas_vd:[{denom:'V1', nivel:'PA', longLibre:4}],
    bases:[{denom:'B1', cant:6, ancho:1.2, largo:1.2, alto:0.5}], losas:[{denom:'L1', sup:20}], losas_macizas:[{denom:'LM1'}],
    elementos:[{tipo:'columna', denom:'C9'}, {tipo:'pared', denom:'X'}]};
  await leer('despiece.json', JSON.stringify(desp));
  const s = S();
  ok('despiece → columnas 3 (C1, C2, C9)', s.columnas.length===3 && s.columnas[0].denom==='C1' && s.columnas[0].cantElem===6 && s.columnas[0].secB===30);
  ok('campos faltantes toman el valor por defecto (C2 secA 20, phi 12)', s.columnas[1].secA===20 && s.columnas[1].phi===12);
  ok('vigas VF 1 / VD 1, bases 1, losas 1, macizas 1', s.vigas_vf.length===1 && s.vigas_vd.length===1 && s.bases.length===1 && s.losas.length===1 && (s.losas_macizas||[]).length===1);
  ok('ids únicos', new Set(s.columnas.map(c=>c.id)).size===3);
  ok('datos de obra y campos', d.getElementById('obra-prop').value==='NAMASTE I' && d.getElementById('obra-nombre').value==='Departamentos' && d.getElementById('sup-pb').value==='150' && d.getElementById('col-horm-tipo').value==='H21');
  ok('calcula: H° columnas > 0', s.resultados.col.horm > 0);
  ok('obra activa y guardada en la lista', w.eval('_activa')?.nombre==='NAMASTE I' && !!w._entrada('NAMASTE I', w.eval('V_PRINCIPAL')));
  ok('avisa lo que no cargó (campo y tipo inválidos)', alerts.length===1 && /no-existe/.test(alerts[0]) && /pared/.test(alerts[0]));
  // 3. backup de ObraCalc
  alerts.length = 0; nombrePrompt = 'ALBORCH copia';
  await leer('VIVIENDA_UNIFAMILIAR_20260927_0422_obracalc.json', fs.readFileSync('C:/Users/feder/Downloads/VIVIENDA_UNIFAMILIAR_20260927_0422_obracalc.json','utf8'));
  ok('backup de ObraCalc → obra abierta con sus columnas', S().columnas.length > 0 && w.eval('_activa')?.nombre==='ALBORCH copia' && !alerts.length);
  // 4. archivo roto
  alerts.length = 0; await leer('roto.json', '{tareas: [');
  ok('json roto → aviso', alerts.length===1 && /no es un .json válido/.test(alerts[0]));
  // 5. plantilla: se puede volver a importar tal cual
  let blob = null; w.iaGuardarArchivo = async (n, b) => { blob = await b.text(); return true; };
  await w.descargarPlantillaDespiece(); alerts.length = 0; nombrePrompt = 'Plantilla';
  await leer('plantilla_despiece_obracalc.json', blob);
  ok('la plantilla se importa sin avisos (1 de cada elemento)', !alerts.length && S().columnas.length===1 && S().vigas_vf.length===1 && S().bases.length===1);
  console.log(out.join('\n')); console.log('ERRORES', JSON.stringify(err)); if (alerts.length) console.log(alerts);
  process.exit(0);
}, 1500);
