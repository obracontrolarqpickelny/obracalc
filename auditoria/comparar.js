// Compara la app contra el oráculo independiente, por escenario.
// uso: node comparar.js <escenario> [archivo.html]
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const { oraculo } = require('./oraculo.js');
const esc = process.argv[2] || 'base';
const html = fs.readFileSync(process.argv[3] || 'C:/Users/feder/Downloads/computo_obra.html', 'utf8');
const vc = new VirtualConsole(); const errores = [];
vc.on('jsdomError', e => errores.push(String(e.message || e).slice(0, 160)));
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/', virtualConsole: vc });
const w = dom.window, d = w.document;
w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = function(){}; w.HTMLElement.prototype.scrollTo = function(){};
w.fetch = async () => ({ json: async () => ({ ok: true }) }); w.confirm = () => true; w.prompt = () => 'X';
const ESC = require('./escenarios.js');
setTimeout(() => {
  try {
    const S = w.eval('state');
    ESC[esc](w, d, S);
    w.renderAll(); w.updateDashboard();
    const snap = JSON.parse(JSON.stringify(w.captureSnapshot()));
    const O = oraculo(snap);
    const R = S.resultados;
    const filas = [];
    const chk = (grupo, nombre, app, ora, tol = 0.001) => {
      const a = +app || 0, o = +ora || 0;
      const dif = Math.abs(a - o), rel = o ? dif/Math.abs(o) : (a ? 1 : 0);
      const ok = dif <= 1e-6 || rel <= tol;
      filas.push({grupo, nombre, app:a, ora:o, ok});
    };
    // Pestañas
    chk('Columnas', 'H° m³', R.col.horm, O.col.vol);
    Object.keys({...R.vig.byTipo, ...O.vig.porTipo}).forEach(t => chk('Vigas', `H° ${t} m³`, R.vig.byTipo[t], O.vig.porTipo[t]));
    Object.keys({...R.bases.byTipo, ...O.bases.porTipo}).forEach(t => chk('Bases', `H° ${t} m³`, R.bases.byTipo[t], O.bases.porTipo[t]));
    chk('Bases', 'hidrófugo L', R.bases.hidro, O.bases.hidro);
    chk('Cimientos', 'volumen m³', R.cim.vol, O.cim.vol); chk('Cimientos', 'H° m³', R.cim.volHorm, O.cim.horm);
    chk('Cimientos', 'piedra m³', R.cim.piedra, O.cim.piedra); chk('Cimientos', 'hidrófugo L', R.cim.hidro, O.cim.hidro);
    chk('Mampostería', 'ladrillos c/desp', R.mamp.ladrillones, O.mamp.lad); chk('Mampostería', 'ladrillos netos', R.mamp.ladNetos, O.mamp.ladNet);
    chk('Mampostería', 'cem. alb. kg', R.mamp.cemAlbKg, O.mamp.alb); chk('Mampostería', 'cemento kg', R.mamp.portKg, O.mamp.port);
    chk('Mampostería', 'cal kg', R.mamp.calKg, O.mamp.cal); chk('Mampostería', 'arena m³', R.mamp.arena, O.mamp.arena); chk('Mampostería', 'hidrófugo L', R.mamp.hidroL, O.mamp.hidro);
    chk('Revoques', 'cemento kg', R.rev.portKg, O.rev.port); chk('Revoques', 'cem. alb. kg', R.rev.cemAlbKg, O.rev.alb); chk('Revoques', 'cal kg', R.rev.calKg, O.rev.cal);
    chk('Revoques', 'yeso kg', R.rev.yesoKg, O.rev.yeso); chk('Revoques', 'arena gruesa m³', R.rev.arenaGr, O.rev.arenaG); chk('Revoques', 'arena fina m³', R.rev.arenaFi, O.rev.arenaF); chk('Revoques', 'hidrófugo L', R.rev.sika, O.rev.hidro);
    chk('Contrapiso', 'cemento kg', R.cont.cemPb25*25, O.cont.cem); chk('Contrapiso', 'arena m³', R.cont.arena, O.cont.arena); chk('Contrapiso', 'ripio m³', R.cont.ripio, O.cont.ripio);
    Object.keys({...(R.cont.elabPorTipo||{}), ...O.cont.elab}).forEach(t => chk('Contrapiso', `H° ${t} m³`, (R.cont.elabPorTipo||{})[t], O.cont.elab[t]));
    chk('Losas', 'losetas 12', R.losa.losetas12, O.losa.l12); chk('Losas', 'losetas 16', R.losa.losetas16, O.losa.l16);
    Object.keys({...R.losa.byTipo, ...O.losa.horm}).forEach(t => chk('Losas', `H° capa ${t} m³`, R.losa.byTipo[t], O.losa.horm[t]));
    chk('Losas', 'macizas H° m³', R.losaMac.horm, O.macVol);
    chk('Cubierta', 'cemento kg', R.techo.portKg, O.techo.port); chk('Cubierta', 'cem. alb. kg', R.techo.albKg, O.techo.alb); chk('Cubierta', 'arena m³', R.techo.arena, O.techo.arena);
    chk('Cubierta', 'aislante m³', R.techo.volAisl, O.techo.aisl); chk('Cubierta', 'membrana m²', R.techo.membra*10, O.techo.membranaM2); chk('Cubierta', 'emulsión L', R.techo.emulsion, O.techo.emulsion);
    chk('Dosificación', 'cemento kg/m³', S.hormFactor.cemBol25*25, O.hf.cemKg); chk('Dosificación', 'arena m³/m³', S.hormFactor.arena, O.hf.arena); chk('Dosificación', 'ripio m³/m³', S.hormFactor.piedra, O.hf.piedra);
    // Resumen (neto en unidad base)
    const RS = {}; const res = w.datosResumen();
    res.secciones.forEach(sc => sc.filas.forEach(f => {
      let k = f.k; const base = f.neto * w.uc(f.k).cont;
      if (k === 'hormElab') k = 'H:' + f.mat.split(' ')[1];
      else if (k === 'alambre') k = /14/.test(f.mat) ? 'alambre14' : 'alambre17';
      else if (k === 'clavos') k = /2½/.test(f.mat) ? 'clavos25' : 'clavos2';
      else if (k === 'pomeca' || k === 'perlita') k = 'aisl';
      else if (k === 'hierro') k = 'hierro:' + f.mat.match(/Ø([\d,.]+)/)[1].replace(',', '.');
      RS[k] = (RS[k] || 0) + base;
    }));
    Object.keys(O.resumen).forEach(k => chk('RESUMEN', k, RS[k], O.resumen[k]));
    Object.keys(RS).filter(k => !(k in O.resumen) && !k.startsWith('hierro:') && !/malla/.test(k)).forEach(k => chk('RESUMEN', k + ' (no previsto)', RS[k], 0));
    // Hierro: metros por Ø, barras sin optimizar, barras del Resumen dentro de los límites
    const H = S._hierros || {}, plan = w.planCortes();
    const opt = w.optimizarCortesOn();
    Object.keys({...H, ...O.hierroMl}).forEach(ph => chk('Hierro', `Ø${ph} metros`, H[ph], O.hierroMl[ph]));
    Object.keys({...O.barrasSin}).forEach(ph => chk('Hierro', `Ø${ph} barras sin optimizar`, plan[ph]?.barrasSin, O.barrasSin[ph]));
    Object.keys(plan).forEach(ph => {
      const d = plan[ph], B = w.eval('BARRA_COMERCIAL'), min = Math.ceil(d.ml/B - 1e-9);
      const okLim = d.barrasCon >= min && d.barrasCon <= d.barrasSin;
      filas.push({grupo:'Hierro', nombre:`Ø${ph} optimizado dentro de [${min}, ${d.barrasSin}]`, app:d.barrasCon, ora:okLim ? d.barrasCon : NaN, ok:okLim});
      const enRes = RS['hierro:' + ph] / B, esperado = opt ? d.barrasCon : d.barrasSin;
      chk('Hierro', `Ø${ph} barras en el Resumen = opción ${opt ? 'optimizado' : 'sin optimizar'}`, enRes, esperado);
    });
    const malos = filas.filter(x => !x.ok);
    console.log(`=== ${esc}: ${filas.length} controles · ${malos.length} diferencias ${O.notas.length ? '· notas: ' + [...new Set(O.notas)].join('; ') : ''}${Object.keys(O.colPorTipoEstr).length ? ' · columnas con estribo no simple: ' + JSON.stringify(O.colPorTipoEstr) : ''}`);
    malos.forEach(x => console.log(`  ✗ ${x.grupo} · ${x.nombre}: app ${x.app.toFixed(4)} · oráculo ${isNaN(x.ora) ? '—' : x.ora.toFixed(4)}`));
    if (process.argv.includes('--todo')) filas.forEach(x => console.log(`  ${x.ok ? '✓' : '✗'} ${x.grupo} · ${x.nombre}: ${x.app.toFixed(3)} / ${isNaN(x.ora) ? '—' : x.ora.toFixed(3)}`));
    console.log('ERRORES JS', errores.length ? errores : '[]');
  } catch (e) { console.log('FALLA', e.stack); console.log('ERRORES', errores); }
  process.exit(0);
}, 1500);
