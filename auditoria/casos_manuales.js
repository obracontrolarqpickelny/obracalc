// FASE 5 — Casos controlados con resultado calculado A MANO (valores esperados fijos).
// Obra vacía, un elemento por vez; se verifica pestaña → Resumen → PDF por ítem → % de incremento.
const { JSDOM, VirtualConsole } = require('jsdom');
const html = require('fs').readFileSync(process.argv[2] || 'C:/Users/feder/Downloads/computo_obra.html', 'utf8');
const vc = new VirtualConsole(); const err = []; vc.on('jsdomError', e => err.push(String(e.message||e).slice(0,150)));
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/', virtualConsole: vc });
const w = dom.window, d = w.document; w.scrollTo=()=>{}; w.HTMLElement.prototype.scrollIntoView=function(){}; w.HTMLElement.prototype.scrollTo=function(){}; w.fetch=async()=>({json:async()=>({ok:true})});
const set = (id, v) => { const e = d.getElementById(id); if (!e) throw new Error('no existe '+id); e.value = v; };
const filas = []; let caso = '';
const ok = (nombre, obtenido, esperado, tol = 0.002) => {
  const o = +obtenido, e = +esperado, bien = Math.abs(o - e) <= Math.max(tol*Math.abs(e), 0.006);
  filas.push(`${bien ? '✓' : '✗'} [${caso}] ${nombre}: esperado ${e} · obtenido ${Math.round(o*1000)/1000}`);
};
const vacia = () => {
  w.applySnapshot(w.snapshotVacio());
  const S = w.eval('state');
  ['columnas','vigas_vf','vigas_vd','bases','losas','losas_macizas'].forEach(k => S[k] = []);
  S.murosExtra = []; S.cpSectores = []; S.antepechos = []; S.techoSectores = []; S.nivelesExtra = []; S.nivelesActivos = [];
  d.querySelectorAll('#page-obra input[type=number], #page-mamposteria input[type=number], #page-revoques input[type=number], #page-contrapiso input[type=number], #page-bases input[type=number], #page-losas input[type=number]')
    .forEach(i => { if (/sup|cr-|crg-|rg-|rf-|cim-largo|cim-ancho|cim-alto|techo-sup|mamp-hid-hil|mamp-hid-largo|carp-sup/.test(i.id)) i.value = 0; });
  set('dos-cem', 1); set('dos-arena', 3); set('dos-piedra', 3); set('dos-ac', 0.5); set('mort-ac', 0.55); set('res-pct', 12);
  set('techo-sup', 0);
  return S;
};
const resumen = () => { const o = {}; w.datosResumen().secciones.forEach(sc => sc.filas.forEach(f => { o[f.mat] = f; })); return o; };
const item = re => w.materialesPorItem().secciones.find(s => re.test(s.titulo));
const fItem = (it, re) => it?.filas.find(f => re.test(f.mat));
setTimeout(() => {
  try {
    let S, R, it;
    // ─ CASO 1: 1 columna 20×20, alt 3,00, 4 Ø12, estribos Ø6 c/15, H17 ─
    caso = 'Columna'; S = vacia();
    S.columnas = [{id:1, denom:'C1', cantElem:1, forma:'rect', secA:20, secB:20, alt:3, phi:12, nBarras:4, phi2:0, n2:0, phi3:0, n3:0, phiEstr:6, sepEstr:150, estribType:1, nivel:'PB'}];
    set('col-horm-tipo', 'H17'); w.renderAll();
    // H° = 0,20 × 0,20 × 3,00 = 0,12 m³
    ok('H° m³ (pestaña)', S.resultados.col.horm, 0.12);
    // Barra: 3,00 + 0,25 pata + 60×0,012 = 3,97 → 4,00 m; 4 barras = 16 m; 3 piezas por barra de 12 → 2 barras
    ok('Ø12 metros', S._hierros[12], 16); ok('Ø12 barras (Resumen, sin %)', S._barrasPorPhi[12], 2);
    // Estribos: 3,00/0,15 = 20 + 1 = 21; estribo 16×16 → 0,64 + 2 ganchos 0,06 = 0,76 m; 21 × 0,76 = 15,96 m; 15 por barra → 2 barras
    ok('estribos por columna', w.nEstribosCol(S.columnas[0]), 21); ok('Ø6 metros', S._hierros[6], 15.96); ok('Ø6 barras', S._barrasPorPhi[6], 2);
    R = resumen();
    ok('Resumen H17 elaborado a pedir (exacto)', R['H° H17 elaborado'].cant, 0.12);
    ok('Resumen Ø12 a pedir: 2 × 1,12 = 2,24 → 3', Math.ceil(R['Hierro Ø12'].cant - 1e-9), 3);
    ok('Resumen alambre N°14 neto: 0,12 × 3,5', R['Alambre N°14'].neto, 0.42);
    ok('Resumen clavos 2" neto: 0,12 × 1', R['Clavos punta París 2"'].neto, 0.12);
    it = item(/Columnas/); ok('PDF ítem Columnas · H17', fItem(it, /H17/).cant, 0.12); ok('PDF ítem Columnas · Ø12 (barras de 12 m en m)', fItem(it, /Ø12/).neto*12, 24);

    // ─ CASO 2: 1 viga VD 20×30, luz 4,00, 4 Ø10, estribos Ø6 c/20, H21 ─
    caso = 'Viga'; S = vacia();
    S.vigas_vd = [{id:1, denom:'V1', phi:10, nBarras:4, phi2:0, n2:0, phi3:0, n3:0, phiEstr:6, sepEstr:20, longLibre:4, ancho:20, alto:30, estribType:1, hormTipo:'H21', techoLiviano:false, nivel:'PB'}];
    w.renderAll();
    ok('H° H21 m³: 0,2 × 0,3 × 4', S.resultados.vig.byTipo.H21, 0.24);
    // Barra 4 + 2×60×0,010 = 5,20 → 5,50 m; 4 barras = 22 m; 2 por barra → 2 barras
    ok('Ø10 metros', S._hierros[10], 22); ok('Ø10 barras', S._barrasPorPhi[10], 2);
    // Estribos: 4/0,20 = 20 + 1 = 21; 16×26 → 0,84 + 0,12 = 0,96 m → 20,16 m; 12 por barra → 2 barras
    ok('estribos', w.nEstribosViga(S.vigas_vd[0]), 21); ok('Ø6 metros', S._hierros[6], 20.16); ok('Ø6 barras', S._barrasPorPhi[6], 2);
    ok('Resumen H21 elaborado', resumen()['H° H21 elaborado'].cant, 0.24);

    // ─ CASO 3: 1 base 1,00 × 1,20 × 0,50, Ø10 c/15 en X e Y, H17 ─
    caso = 'Base'; S = vacia();
    S.bases = [{id:1, denom:'B1', cant:1, ancho:1.0, largo:1.2, alto:0.5, phi:10, sep:150, phi2:10, sep2:150, hormTipo:'H17'}];
    w.renderAll();
    ok('H° m³: 1,0 × 1,2 × 0,5', S.resultados.bases.horm, 0.6);
    // X: barra 1,00 − 0,08 + 2×0,10 = 1,12 m, cantidad 1,20/0,15 = 8 + 1 = 9 → 10,08 m
    // Y: barra 1,20 − 0,08 + 0,20 = 1,32 m, cantidad 1,00/0,15 = 6,67 → 7 + 1 = 8 → 10,56 m   · total 20,64 m
    const [bx, by] = w.baseBarras(S.bases[0]);
    ok('barras X (sin error de coma flotante: 1,2/0,15 = 8)', bx.N, 9); ok('barras Y', by.N, 8); ok('Ø10 metros', S._hierros[10], 20.64);
    ok('Tarjeta de arriba H17 (bases + cimientos)', +d.querySelector('#bases-stats-top .stat-value').textContent.replace(',','.'), 0.6);

    // ─ CASO 4: muro 10 m², ladrillo 0,25×0,05, espesor 0,12, junta 0,015, cem. alb. 1:4, desp. 5 % ─
    caso = 'Muro'; S = vacia();
    set('lad-largo', 0.25); set('lad-alto', 0.05); set('lad-esp', 0.12); set('lad-junta', 0.015); set('mamp-sup-pb', 10);
    set('mamp-desp', 5); set('mamp-desp-mort', 0); set('mamp-mort-tipo', '2'); set('mz-mamp-t2-alb', 1); set('mz-mamp-t2-are', 4);
    w.renderAll();
    // Ladrillos/m² = 1/(0,265×0,065) = 58,055 → 580,55 → 581 netos → ×1,05 = 610,05 → 611
    ok('ladrillos netos', S.resultados.mamp.ladNetos, 581); ok('ladrillos con desperdicio', S.resultados.mamp.ladrillones, 611);
    // Mortero/m² = 0,12 − 58,055×0,25×0,05×0,12 = 0,032917 m³ → 0,32917 m³
    // Cem. alb. 1:4 por m³ (vol. absolutos): 1.200/(0,41379 + 2,30769 + 0,66)/0,97 → 344,23 kg/m³ · arena 1,14743 m³/m³
    ok('cem. alb. kg: 0,32917 × 344,23', S.resultados.mamp.cemAlbKg, 113.31); ok('arena m³: 0,32917 × 1,14743', S.resultados.mamp.arena, 0.37770);
    set('pct-mamp', 20); w.pctTabsCambio && w.pctTabsCambio();
    R = resumen(); ok('Resumen ladrillos a pedir con 20 % de la pestaña: 611 × 1,2 = 733,2', R['Ladrillón'].cant, 733.2);
    set('pct-mamp', '');

    // ─ CASO 5: contrapiso PB 20 m² × 10 cm en obra + carpeta 20 m² × 3,5 cm; dosaje 1:3:3, a/c 0,5 ─
    caso = 'Contrapiso'; S = vacia();
    set('cp-sup-pb', 20); set('cp-esp-pb', 10); set('carp-sup-pb', 20); set('carp-esp', 3.5); set('cont-horm-tipo', 'obra'); set('cp-arm-phi-pb', '0');
    w.renderAll();
    // Dosaje 1:3:3 → cemento 1.400/((0,45161+1,73077+1,66667+0,7)/0,985) = 303,14 kg/m³ · arena = ripio = 0,64958 m³/m³
    ok('cemento del dosaje kg/m³', S.hormFactor.cemBol25*25, 303.14);
    // Contrapiso 2 m³ al 60 % del cemento: 2 × 303,14 × 0,6 = 363,77 kg · carpeta 0,7 m³ × 250 = 175 kg → 538,77 kg
    ok('cemento total kg', S.resultados.cont.cemPb25*25, 538.77);
    // Arena: 2 × 0,64958 = 1,29916 + carpeta 0,7 × 1,428571 = 1,0 → 2,29916 · ripio 1,29916
    ok('arena m³', S.resultados.cont.arena, 2.29916); ok('ripio m³', S.resultados.cont.ripio, 1.29916);
    R = resumen(); ok('Resumen cemento neto (kg ÷ 25 = bolsas)', R['Cemento Portland'].neto, 538.77/25);

    // ─ CASO 6: revoque grueso interior PB 10 m² × 2,5 cm, cem. alb. 1:5 ─
    caso = 'Revoque'; S = vacia();
    set('rg-int-pb', 10); set('rev-esp-gi', 2.5); set('rev-opc-gi', '2'); set('mz-gi-t2-alb', 1); set('mz-gi-t2-are', 5); set('rev-hid-int', 0);
    w.renderAll();
    // 1:5 → 1.200/((0,41379+2,88462+0,66)/0,97) = 294,06 kg/m³ · arena 1,22524 m³/m³; volumen 0,25 m³
    ok('cem. alb. kg', S.resultados.rev.cemAlbKg, 73.51); ok('arena gruesa m³', S.resultados.rev.arenaGr, 0.30631);

    // ─ CASO 7: cimiento 10 × 0,40 × 0,50 ciclópeo en obra (dosaje 1:3:3) ─
    caso = 'Cimiento'; S = vacia();
    set('cim-largo', 10); set('cim-ancho', 0.4); set('cim-alto', 0.5); set('cim-tipo', 'ciclopeo'); set('cim-horm-tipo', 'obra');
    w.renderAll();
    // 2 m³: piedra 45 % = 0,9 · H° 1,1 m³ → cemento 1,1 × 303,14 = 333,45 kg · arena = ripio = 0,71454 m³
    ok('H° m³', S.resultados.cim.volHorm, 1.1); ok('piedra m³', S.resultados.cim.piedra, 0.9);
    R = resumen(); ok('Resumen cemento neto bolsas', R['Cemento Portland'].neto, 333.45/25); ok('Resumen ripio neto', R['Ripio Clasificado'].neto, 0.71454);
    ok('Resumen piedra bola a pedir: 0,9 × 1,12', R['Piedra Bola'].cant, 1.008);

    // ─ CASO 8: losa pretensada 10 m², viguetas c/500 mm, capa 5 cm H17, malla ─
    caso = 'Losa'; S = vacia();
    S.losas = [{id:1, denom:'L1', cant:1, sup:10, alt:12, phi:'6', sep:500, capComp:5, hormTipo:'H17', nivel:'PB', arm:'malla'}];
    w.renderAll();
    // Losetas: 1000/500 = 2 por m² × 10 × 1,05 = 21 · capa 10 × 0,05 = 0,5 m³
    ok('losetas', S.resultados.losa.losetas12, 21); ok('H° capa m³', S.resultados.losa.byTipo.H17, 0.5);

    // ─ CASO 9: redondeo — 25 barras con 12 % = 28 exactas (antes pedía 29) ─
    caso = 'Redondeo'; S = vacia();
    // 25 columnas de 4 Ø12 de 4,00 m = 100 piezas, 3 por barra → 34 barras... se usa una cantidad que dé 25 barras justas:
    S.columnas = [{id:1, denom:'C', cantElem:25, forma:'rect', secA:20, secB:20, alt:9.75, phi:12, nBarras:1, phi2:0, n2:0, phi3:0, n3:0, phiEstr:6, sepEstr:150, estribType:1, nivel:'PB'}];
    w.renderAll();
    // Barra: 9,75 + 0,25 + 0,72 = 10,72 → 11,00 m: 1 por barra → 25 barras Ø12; × 1,12 = 28,000000000000004 → debe pedir 28
    ok('barras Ø12', S._barrasPorPhi[12], 25);
    R = resumen(); ok('a pedir (redondeo hacia arriba seguro)', w.ceilQ(R['Hierro Ø12'].cant), 28);
    const tabla = [...d.querySelectorAll('#res-materiales tr')].find(tr => /Hierro Ø12/.test(tr.textContent));
    w.calcResumen(); const tabla2 = [...d.querySelectorAll('#res-materiales tr')].find(tr => /Hierro Ø12/.test(tr.textContent));
    ok('lo que muestra la tabla del Resumen', +(tabla2?.querySelector('td.accent')?.textContent||'0'), 28);

    // ─ CASO 10: casilla con valor negativo desde el teclado ─
    caso = 'Negativo'; S = vacia();
    const inp = d.getElementById('mamp-sup-pb'); inp.value = '-5'; inp.dispatchEvent(new w.Event('input', {bubbles:true}));
    ok('la casilla queda en 0', +inp.value, 0);

    const malos = filas.filter(x => x.startsWith('✗'));
    console.log(filas.join('\n'));
    console.log(`\n${filas.length} verificaciones · ${malos.length} fallas`);
    console.log('ERRORES', err);
  } catch (e) { console.log(filas.join('\n')); console.log('FALLA', e.stack); console.log('ERRORES', err); }
  process.exit(0);
}, 1500);
