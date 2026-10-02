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
    // Estribos con reestribado: zona = máx(0,60; 2×0,20; 3/5 = 0,60) = 0,60 m c/7,5 cm → 8 + 8 espacios;
    // centro 3 − 1,20 = 1,80 c/15 → 12 espacios; 28 espacios + 1 = 29 estribos
    // estribo 16×16 → 0,64 + 2 ganchos 0,06 = 0,76 m; 29 × 0,76 = 22,04 m; 15 por barra → 2 barras
    ok('estribos por columna (con reestribado)', w.nEstribosCol(S.columnas[0]), 29); ok('Ø6 metros', S._hierros[6], 22.04); ok('Ø6 barras', S._barrasPorPhi[6], 2);
    S.columnas[0].altT = 4.3; ok('alt. total 4,30 (luz H° 3): zona 0,60 → 16 + 3,10/0,15 = 21 → 38', w.nEstribosCol(S.columnas[0]), 38); S.columnas[0].altT = null;
    S.columnas[0].sepEstr = 200; ok('otra fila c/20 → cruces c/10: 6 + 6 + 9 + 1', w.nEstribosCol(S.columnas[0]), 22); S.columnas[0].sepEstr = 150;
    S.columnas[0].alt = 1.0; ok('columna corta 1,00: todo densificado → 1/0,075 = 14 + 1', w.nEstribosCol(S.columnas[0]), 15); S.columnas[0].alt = 3; w.renderAll();
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
    // Estribos con reestribado: zona = máx(0,60; 2×0,30; 4/5 = 0,80) = 0,80 c/10 → 8 + 8; centro 2,40/0,20 = 12 → 29
    // 16×26 → 0,84 + 0,12 = 0,96 m → 27,84 m; 12 por barra → 3 barras
    ok('estribos (con reestribado)', w.nEstribosViga(S.vigas_vd[0]), 29); ok('Ø6 metros', S._hierros[6], 27.84); ok('Ø6 barras', S._barrasPorPhi[6], 3);
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

    // ─ CASO 4: muro 10 m², ladrillo 0,25×0,05, espesor 0,12, junta 0,015, cem. alb. 1:4; desperdicio = % de la pestaña ─
    caso = 'Muro'; S = vacia();
    set('lad-largo', 0.25); set('lad-alto', 0.05); set('lad-esp', 0.12); set('lad-junta', 0.015); set('mamp-sup-pb', 10);
    set('mamp-mort-tipo', '2'); set('mz-mamp-t2-alb', 1); set('mz-mamp-t2-are', 4);
    w.renderAll();
    // Ladrillos/m² = 1/(0,265×0,065) = 58,055 → 580,55 → 581 netos → a pedir con el 12 % general: 650,72 → 651
    ok('ladrillos netos', S.resultados.mamp.ladNetos, 581); ok('ladrillos a pedir (sólo el % general 12)', S.resultados.mamp.ladrillones, 651);
    // Mortero/m² = 0,12 − 58,055×0,25×0,05×0,12 = 0,032917 m³ → 0,32917 m³
    // Cem. alb. 1:4 por m³ (vol. absolutos): 1.200/(0,41379 + 2,30769 + 0,66)/0,97 → 344,23 kg/m³ · arena 1,14743 m³/m³
    ok('cem. alb. kg: 0,32917 × 344,23', S.resultados.mamp.cemAlbKg, 113.31); ok('arena m³: 0,32917 × 1,14743', S.resultados.mamp.arena, 0.37770);
    set('pct-mamp', 20); w.pctTabsCambio && w.pctTabsCambio();
    ok('pestaña: a pedir con 20 % = 581 × 1,2 = 697,2 → 698', S.resultados.mamp.ladrillones, 698);
    R = resumen(); ok('Resumen ladrillos netos (sin desperdicio propio)', R['Ladrillón'].neto, 580.55);
    ok('Resumen ladrillos a pedir: 580,55 × 1,2 = 696,66 (un solo %)', R['Ladrillón'].cant, 696.66);
    it = item(/Mampostería/); ok('PDF ítem: ladrillos a pedir = Resumen', fItem(it, /Ladrillón/)?.cant, 696.66);
    set('pct-mamp', '');

    // ─ CASO 5: contrapiso PB 20 m² × 10 cm en obra + carpeta 20 m² × 3,5 cm; dosaje 1:3:3, a/c 0,5 ─
    caso = 'Contrapiso'; S = vacia();
    set('cp-sup-pb', 20); set('cp-esp-pb', 10); set('carp-sup-pb', 20); set('carp-esp', 3.5); set('cont-horm-tipo', 'obra'); set('cp-arm-phi-pb', '0');
    w.renderAll();
    // Dosaje 1:3:3 → cemento 1.400/((0,45161+1,73077+1,66667+0,7)/0,985) = 303,14 kg/m³ · arena = ripio = 0,64958 m³/m³
    ok('cemento del dosaje kg/m³', S.hormFactor.cemBol25*25, 303.14);
    // Contrapiso 2 m³ con el dosaje completo: 2 × 303,14 = 606,28 kg
    // Carpeta 1:3 (vol. absolutos, a/c 0,55): 1.400/3.100 + 4.500/2.600 + 0,77 = 2,95238 → /0,97 = 3,04369 m³
    //   → cemento 1.400/3,04369 = 459,97 kg/m³ · arena 3/3,04369 = 0,98565 m³/m³; carpeta 0,7 m³ → 321,98 kg y 0,68995 m³
    ok('cemento total kg: 606,28 + 321,98', S.resultados.cont.cemPb25*25, 928.26);
    ok('arena m³: 1,29916 + 0,68995', S.resultados.cont.arena, 1.98911); ok('ripio m³', S.resultados.cont.ripio, 1.29916);
    R = resumen(); ok('Resumen cemento neto (kg ÷ 25 = bolsas)', R['Cemento Portland'].neto, 928.26/25);
    // Carpeta con cal 1:¼:3 (Dosificaciones): 1.400/3.100 + 150/2.300 + 4.500/2.600 + 1.550×0,55/1.000 = 3,10010 → /0,97 = 3,19598
    //   → cemento 438,05 kg/m³ · cal 46,93 kg/m³ · arena 0,93868 m³/m³; × 0,7 m³
    set('carp-mort-tipo', '1'); set('mz-carp-t1-cem', 1); set('mz-carp-t1-cal', 0.25); set('mz-carp-t1-are', 3); w.morteroCambio();
    ok('carpeta con cal: cal kg 0,7 × 46,93', S.resultados.cont.calKg, 32.85); ok('cemento total kg: 606,28 + 0,7 × 438,05', S.resultados.cont.cemPb25*25, 912.92);
    R = resumen(); ok('Resumen cal neta (bolsas 25 kg)', R['Cal Hidratada Especial'].neto * w.uc('cal').cont, 32.85);
    set('carp-mort-tipo', '3'); w.morteroCambio();

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
    // Losetas: 1000/500 = 2 por m² × 10 = 20 netas · capa 10 × 0,05 = 0,5 m³ · malla 10 m² + 10 % solape = 11 m²
    ok('losetas netas', S.resultados.losa.losetas12, 20); ok('H° capa m³', S.resultados.losa.byTipo.H17, 0.5);
    R = resumen(); ok('Resumen losetas a pedir: 20 × 1,12 (sólo el %)', R['Losetas 12 cm'].cant, 22.4);
    const rm = Object.values(R).find(f => f.k==='mallaSima'); ok('Resumen malla neta m² (con solape)', rm?.neto * w.uc('mallaSima').cont, 11); ok('Resumen malla a pedir: 11 × 1,12', rm?.base, 12.32);
    set('pct-losa', 5); R = resumen(); ok('con 5 % en Losas: losetas 20 × 1,05', R['Losetas 12 cm'].cant, 21);
    it = item(/Losas/); ok('PDF ítem: losetas = Resumen', fItem(it, /Losetas 12/)?.cant, 21); set('pct-losa', '');

    // ─ CASO 8b: losa maciza 3,00 × 5,00, Ø8 c/150 en X e Y (CIRSOC: 15 cm de anclaje + gancho 12 Ø por extremo) ─
    caso = 'Losa maciza'; S = vacia();
    S.losas_macizas = [{id:1, denom:'LM1', cant:1, ancho:3, largo:5, alto:12, phiX:'8', sepX:150, phiY:'8', sepY:150, factor:1, nivel:'PB'}];
    w.renderAll();
    // X: 5/0,15 = 33,3 → 34 + 1 = 35 barras de 3 + 2×(0,15 + 0,096) = 3,492 m · Y: 3/0,15 = 20 + 1 = 21 de 5,492 m
    const [mx, my] = w.macizaBarras(S.losas_macizas[0]);
    ok('barras X', mx.N, 35); ok('largo barra X', mx.L, 3.492); ok('barras Y', my.N, 21); ok('largo barra Y', my.L, 5.492);
    ok('Ø8 metros: 35 × 3,492 + 21 × 5,492', S._hierros[8], 237.552); ok('pestaña ml hierro', S.resultados.losaMac.ml, 237.552);

    // ─ CASO 8c: cubierta 90 m² → membrana 90/9 = 10 rollos netos, a pedir sólo con el % ─
    caso = 'Cubierta'; S = vacia(); set('techo-sup', 90); w.renderAll();
    ok('rollos netos', S.resultados.techo.membra, 10);
    R = resumen(); ok('Resumen membrana neta (m²)', R['Membrana Asfáltica'].neto * w.uc('membrana').cont, 100); ok('Resumen membrana a pedir m²: 100 × 1,12', R['Membrana Asfáltica'].base, 112);

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

    // ─ CASO 11: Resumen — cantidad escrita a mano (columna A pedir final) ─
    caso = 'A pedir final'; S = vacia(); set('techo-sup', 90); w.renderAll(); w.calcResumen();
    const inpA = [...d.querySelectorAll('#res-materiales input[data-aj]')].find(x => /Membrana/.test(x.dataset.aj));
    ok('vacío: placeholder = con incremento 11,2 → 12 rollos enteros', parseFloat(inpA.placeholder.replace(',', '.')), 12);
    inpA.value = '15'; inpA.dispatchEvent(new w.Event('change', {bubbles:true}));
    R = resumen(); ok('final = 15', R['Membrana Asfáltica'].final, 15); ok('con incremento no cambia', R['Membrana Asfáltica'].cant, 11.2);
    const pdf = w.htmlPdfResumen(); ok('el PDF lleva 15 y no 11,2', /Membrana[^]*?>15<\/td>/.test(pdf) && !/>11,20</.test(pdf) ? 1 : 0, 1);
    ok('se guarda con la obra', w.captureSnapshot().resAjustes['membrana|Membrana Asfáltica'], 15);
    const inpB = [...d.querySelectorAll('#res-materiales input[data-aj]')].find(x => /Membrana/.test(x.dataset.aj));
    inpB.value = ''; inpB.dispatchEvent(new w.Event('change', {bubbles:true}));
    ok('borrado → vuelve a la con incremento', resumen()['Membrana Asfáltica'].final, 11.2);

    const malos = filas.filter(x => x.startsWith('✗'));
    console.log(filas.join('\n'));
    console.log(`\n${filas.length} verificaciones · ${malos.length} fallas`);
    console.log('ERRORES', err);
  } catch (e) { console.log(filas.join('\n')); console.log('FALLA', e.stack); console.log('ERRORES', err); }
  process.exit(0);
}, 1500);
