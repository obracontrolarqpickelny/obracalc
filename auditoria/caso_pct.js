module.exports = (w, d, ok, vacia, resumen, setCaso) => {
  // ─ CASO 12: % de la pestaña Columnas — columna 20×20×3 en obra, dosaje 1:3:3 (303,14 kg/m³) ─
  setCaso('% por pestaña'); const S = vacia();
  S.columnas = [{id:1, denom:'C1', cantElem:1, forma:'rect', secA:20, secB:20, alt:3, phi:12, nBarras:4, phi2:0, n2:0, phi3:0, n3:0, phiEstr:6, sepEstr:150, estribType:1, nivel:'PB'}];
  d.getElementById('col-horm-tipo').value = 'obra';
  const prueba = (pct, f, txt) => {
    d.getElementById('pct-col').value = pct; w.pctTabsCambio(); w.renderAll(); w.renderPedirTabs();
    const R = resumen();
    // cemento neto 0,12 × 303,14 = 36,377 kg · alambre N°14 0,12 × 3,5 = 0,42 kg
    ok(`${txt}: Resumen cemento kg = 36,377 × ${f}`, R['Cemento Portland'].base, 36.377*f);
    ok(`${txt}: Resumen alambre N°14 kg = 0,42 × ${f}`, R['Alambre N°14'].base, 0.42*f);
    ok(`${txt}: Resumen hierro Ø12 (barras) = ceil(2 × ${f})`, Math.ceil(R['Hierro Ø12'].cant - 1e-9), Math.ceil(2*f - 1e-9));
    const fila = [...d.querySelectorAll('#pedir-col tr')].find(tr => /Cemento Portland/.test(tr.textContent));
    ok(`${txt}: tarjeta "A pedir" de Columnas, cemento en bolsas enteras = ceil(36,377 × ${f} / 25)`, parseFloat(fila.querySelectorAll('td')[2].textContent), Math.ceil(36.377*f/25 - 1e-9));
    const fm = w.filasMateriales({portland:36.377, al14:0.42, 'H:H21':1}, 'col');
    ok(`${txt}: filas de la pestaña, cemento kg base`, fm.find(x=>x.k==='portland').base, 36.377*f);
    ok(`${txt}: H° elaborado 1 m³ × ${f}`, fm.find(x=>/elaborado/.test(x.mat)).base, f);
    const hm = [...d.querySelectorAll('#col-horm-mat tr')].find(tr => /Cemento Portland/.test(tr.textContent));
    ok(`${txt}: "Materiales del hormigón" cemento kg`, parseFloat(hm.querySelectorAll('td')[1].textContent.replace(/\./g,'').replace(',', '.')), Math.round(36.377*f));
    const ph = d.querySelector('#col-resumen-phi .pedir-phi[data-phi="12"] b');
    ok(`${txt}: panel de hierros Ø12 a pedir`, +ph?.textContent, Math.ceil(2*f - 1e-9));
  };
  prueba('15', 1.15, 'Columnas 15 % (general 12)');
  prueba('5', 1.05, 'Columnas 5 % (menor que el general)');
  prueba('0', 1, 'Columnas 0 %');
  prueba('', 1.12, 'vacío = general 12 %');
  d.getElementById('pct-col').value = '';
};
// ─ CASO 13: H° elaborado con el % de su pestaña — columna H21 1 m³ con Columnas 10 %, viga H21 1 m³ con Vigas 0 % ─
module.exports.elab = (w, d, ok, vacia, resumen, setCaso) => {
  setCaso('H° elaborado con %'); const S = vacia();
  S.columnas = [{id:1, denom:'C1', cantElem:1, forma:'rect', secA:50, secB:50, alt:4, phi:12, nBarras:4, phi2:0, n2:0, phi3:0, n3:0, phiEstr:6, sepEstr:150, estribType:1, nivel:'PB'}];
  S.vigas_vd = [{id:1, denom:'V1', phi:10, nBarras:4, phi2:0, n2:0, phi3:0, n3:0, phiEstr:6, sepEstr:20, longLibre:5, ancho:20, alto:100, estribType:1, hormTipo:'H21', techoLiviano:false, nivel:'PB'}];
  d.getElementById('col-horm-tipo').value = 'H21'; d.getElementById('pct-col').value = '10'; d.getElementById('pct-vig').value = '0';
  w.pctTabsCambio(); w.renderAll(); w.renderPedirTabs();
  // 0,5 × 0,5 × 4 = 1 m³ (col) + 0,2 × 1 × 5 = 1 m³ (viga) → neto 2 · a pedir 1 × 1,10 + 1 × 1,00 = 2,10
  const R = resumen();
  ok('Resumen H21 neto', R['H° H21 elaborado'].neto, 2); ok('Resumen H21 a pedir = 1,1 + 1,0', R['H° H21 elaborado'].cant, 2.1);
  const fila = [...d.querySelectorAll('#pedir-col tr')].find(tr => /H21/.test(tr.textContent));
  ok('tarjeta Columnas: H21 a pedir 1,10', parseFloat(fila.querySelectorAll('td')[2].textContent.replace(',', '.')), 1.1);
  const hm = [...d.querySelectorAll('#col-horm-mat tr')].find(tr => /H21/.test(tr.textContent));
  ok('Materiales del H° de Columnas: 1,10 m³', parseFloat(hm.querySelectorAll('td')[1].textContent.replace(',', '.')), 1.1);
  d.getElementById('pct-col').value = ''; d.getElementById('pct-vig').value = ''; w.pctTabsCambio();
  ok('pestañas vacías → general 12 %: 2 × 1,12', resumen()['H° H21 elaborado'].cant, 2.24);
};
