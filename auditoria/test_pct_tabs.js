// Auditoría del % por pestaña: cada material del Resumen = Σ (cantidad del ítem × % de SU pestaña)
const { JSDOM, VirtualConsole } = require('jsdom');
const ESC = require('./escenarios.js');
const esc = process.argv[2] || 'completo';
const html = require('fs').readFileSync(process.argv[3] || 'C:/Users/feder/Downloads/computo_obra.html', 'utf8');
const vc = new VirtualConsole(); const err = []; vc.on('jsdomError', e => err.push(String(e.message||e).slice(0,150)));
const dom = new JSDOM(html, {runScripts:'dangerously', pretendToBeVisual:true, url:'http://localhost/', virtualConsole:vc});
const w = dom.window, d = w.document; w.scrollTo=()=>{}; w.HTMLElement.prototype.scrollIntoView=function(){}; w.fetch=async()=>({json:async()=>({ok:true})}); w.confirm=()=>true;
const PCT = {col:15, vig:0, bas:30, mamp:20, rev:5, cp:7, losa:3};
setTimeout(() => {
  const S = w.eval('state'); ESC[esc](w, d, S);
  Object.entries(PCT).forEach(([t,v]) => d.getElementById('pct-'+t).value = v);
  d.getElementById('res-pct').value = 12;
  w.renderAll(); w.updateDashboard();
  const MI = w.materialesPorItem();
  const IM = w.eval('ITEM_MAT');
  // esperado por material: Σ q × f(tab); H° elaborado exacto
  const esp = {}, neto = {};
  MI.items.forEach(it => Object.entries(it.m).forEach(([key, q]) => {
    let k = key;
    if (key.startsWith('H:')) k = key; else if (key.startsWith('hierro:')) k = key;
    else if (key.startsWith('lad:')) k = 'lad:' + key.slice(4);
    else if (key.startsWith('msima:')) k = 'malla:' + key.slice(6);
    else if (key === 'malla') k = 'malla:Q188';
    if (k.startsWith('msima:')) k = 'malla:' + key.slice(6);
    const f = 1 + PCT[it.tab]/100;   // todos, también el H° elaborado
    esp[k] = (esp[k]||0) + q*f; neto[k] = (neto[k]||0) + q;
  }));
  const RS = {};
  w.datosResumen().secciones.forEach(sc => sc.filas.forEach(fl => {
    let k = fl.k;
    if (k === 'hormElab') k = 'H:' + fl.mat.split(' ')[1];
    else if (k === 'hierro') k = 'hierro:' + fl.mat.match(/Ø([\d,.]+)/)[1].replace(',', '.');
    else if (k === 'ladrillon') k = 'lad:' + fl.mat;
    else if (k === 'mallaSima') k = 'malla:' + fl.mat.match(/Q\d+/)[0];
    else if (k === 'alambre') k = /14/.test(fl.mat) ? 'al14' : 'al17';
    else if (k === 'clavos') k = /2½/.test(fl.mat) ? 'cl25' : 'cl2';
    RS[k] = {base: fl.base, f: fl.f};
  }));
  let fallas = 0;
  Object.keys({...esp, ...RS}).sort().forEach(k => {
    const e = esp[k]||0, a = RS[k]?.base||0, nt = neto[k]||0;
    const tol = k.startsWith('hierro:') ? 12*Math.max(2, 0.02*e/12) : Math.max(1e-6, 1e-4*e);
    const ok = Math.abs(a - e) <= tol;
    if (!ok) fallas++;
    console.log(`${ok?'✓':'✗'} ${k.padEnd(22)} neto ${nt.toFixed(2).padStart(10)}  esperado ${e.toFixed(2).padStart(10)} (×${nt?(e/nt).toFixed(4):'-'})  Resumen ${a.toFixed(2).padStart(10)} (×${RS[k]?.f?.toFixed?.(4)})`);
  });
  console.log(`\n${esc}: ${fallas} materiales con el % mal aplicado · errores JS ${JSON.stringify(err)}`);
  process.exit(0);
}, 1500);
