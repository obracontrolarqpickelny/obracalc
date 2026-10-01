// ════════════════════════════════════════════════════════════════════════════
// ORÁCULO INDEPENDIENTE — recalcula ObraCalc desde los DATOS CARGADOS (snapshot)
// sin usar ninguna función de la app. Reglas tomadas de lo acordado con el
// usuario y documentado en el código; implementación propia.
// ════════════════════════════════════════════════════════════════════════════
const CEIL = v => Math.ceil(+v - 1e-9*Math.max(1, Math.abs(+v)));   // redondeo seguro (mismo criterio pedido)
const num = (v, def = 0) => { const x = parseFloat(String(v ?? '').replace(',', '.')); return isFinite(x) ? x : def; };

function oraculo(snap) {
  const F = snap.fields || {}, C = snap.checks || {};
  const f = (id, def = 0) => num(F[id], def);
  const B = num(snap.unidades?.hierro?.cont, 12) || 12;               // largo de barra comercial
  const out = {notas: []};

  // ── Niveles por área ──
  const base = [{k:'PB',suf:'pb'},{k:'PA',suf:'pa'},{k:'N3',suf:'p3'},{k:'TQ',suf:'tanque'}];
  const act = new Set(['PB', ...(snap.nivelesActivos || [])]);
  const extras = (snap.nivelesExtra || []);
  const oc = snap.nivOcultos || {};
  const area = pag => [...base.filter(n => act.has(n.k)), ...extras.filter(x => !x.solo || x.solo === pag).map(x => ({k:x.k, suf:x.k.toLowerCase()}))]
    .filter(n => (n.k !== 'TQ' || pag === 'mamp') && !(oc[pag] || []).includes(n.k));

  // ── Hormigón en obra: dosaje madre (volúmenes absolutos, 1,5 % aire) ──
  const c = f('dos-cem'), a = f('dos-arena'), p = f('dos-piedra'), ac = num(F['dos-ac'], 0.5) || 0.5;
  const mc = c*1400, ma = a*1500, mp = p*1500;
  const vt = (mc/3100 + ma/2600 + mp/2700 + mc*ac/1000) / (1 - 0.015);
  const hf = {cemKg: mc/vt, arena: (ma/vt)/1500, piedra: (mp/vt)/1500};
  out.hf = hf;

  // ── Morteros (volúmenes absolutos, 3 % aire; agua = aglomerante × a/c morteros) ──
  const acM = num(F['mort-ac'], 0.55) || 0.55;
  const mezcla = ({cem=0, cal=0, alb=0, are=0, liv=0}) => {
    if (liv > 0) { const agr = are + liv, lig = cem + cal + alb, V = agr + Math.max(0, 0.5*lig - 0.30*agr);
      return V > 0 ? {port: cem/V*1400, cal: cal/V*600, alb: alb/V*1200, arena: are/V, liv: liv/V, yeso: 0} : {port:0,cal:0,alb:0,arena:0,liv:0,yeso:0}; }
    const mC = cem*1400, mA = alb*1200, mL = cal*600, mR = are*1500;
    const V = (mC/3100 + mA/2900 + mL/2300 + mR/2600 + (mC+mA+mL)*acM/1000) / 0.97;
    return V > 0 ? {port: mC/V, cal: mL/V, alb: mA/V, arena: are/V, liv: 0, yeso: 0} : {port:0,cal:0,alb:0,arena:0,liv:0,yeso:0};
  };
  const DEF = {mamp:{tipo:'2',t2:{alb:1,are:4},t1:{cem:1,cal:1,are:5}}, gi:{tipo:'2',t2:{alb:1,are:5},t1:{cem:0.25,cal:1,are:4}},
    ge:{tipo:'2',t2:{alb:1,are:5},t1:{cem:0.25,cal:1,are:4},t3:{cem:1,are:3}}, fi:{tipo:'2',t2:{alb:1,are:3},t1:{cem:0.125,cal:1,are:2}},
    fe:{tipo:'2',t2:{alb:1,are:3},t1:{cem:0.125,cal:1,are:2},t3:{cem:1,are:3}}, cg:{tipo:'2',t2:{alb:1,are:4},t1:{cem:0.25,cal:1,are:4}},
    cr:{tipo:'4',t4:{ykg:5},t2:{alb:1,are:3},t1:{cem:0.125,cal:1,are:2}}};
  const SEL = {mamp:'mamp-mort-tipo', gi:'rev-opc-gi', ge:'rev-opc-ge', fi:'rev-opc-fi', fe:'rev-opc-fe', cg:'cg-mort-tipo', cr:'cr-mort-tipo'};
  const CAMPOS = {'1':['cem','cal','are'], '2':['alb','are'], '3':['cem','are'], '4':['ykg']};
  const mort = k => { const d = DEF[k]; let t = F[SEL[k]] || d.tipo; if (!d['t'+t]) t = d.tipo;
    const pr = {}; CAMPOS[t].forEach(cc => { const v = parseFloat(F[`mz-${k}-t${t}-${cc}`]); pr[cc] = isFinite(v) && v >= 0 ? v : d['t'+t][cc]; });
    if (t === '4') return {t, pr, r:{port:0,cal:0,alb:0,arena:0,liv:0,yeso:pr.ykg*100}};
    return {t, pr, r: mezcla(pr)}; };

  // ── Hierro: piezas (para barras sin optimizar) y metros por Ø ──
  const piezas = [], ml = {};
  const pz = (phi, L, N, tag) => { if (!(phi > 0 && L > 0.01 && N > 0)) return; piezas.push({phi:+phi, L, N, tag}); ml[phi] = (ml[phi]||0) + L*N; };
  const entera = (phi, metros, tag) => { if (!(phi > 0 && metros > 0)) return; const N = CEIL(metros/B); piezas.push({phi:+phi, L:B, N, tag, entera:true}); ml[phi] = (ml[phi]||0) + metros; };
  const lBarra = (luz, phi, anclajes) => { let br = luz + (anclajes===1 ? 0.25 + 0.06*phi : 2*0.06*phi), e = 0; while (br > B*(e+1)) { e++; br += 0.1*phi; } return CEIL(br/0.5 - 1e-9)*0.5; };
  const gancho = (phiE, man) => (man != null && man !== '' ? +man : 2*10*phiE/10) / 100;   // m por pieza (2 ganchos de 10Ø)

  // ── COLUMNAS ── (sólo estribo rectangular simple se recalcula aparte; otros tipos se marcan)
  const colTipo = F['col-horm-tipo'] || 'H17';
  let colVol = 0; out.colPorTipoEstr = {};
  (snap.columnas || []).forEach(col => {
    const forma = col.forma || ({6:'circ',7:'cuad',8:'cuad',11:'L',12:'T'})[col.estribType] || 'rect';
    const A = +col.secA || 20, Bb = (forma==='cuad'||forma==='circ') ? A : (+col.secB || 20);
    const eA = +col.espA || Math.round(A*0.4), eB = +col.espB || Math.round(Bb*0.4);
    const area = forma==='circ' ? Math.PI*(A/100)**2/4 : (forma==='L'||forma==='T') ? (A*eB + eA*(Bb-eB))/1e4 : A*Bb/1e4;
    colVol += (+col.cantElem||0) * area * (+col.alt||0);
    const h = +col.altT > 0 ? +col.altT : (+col.alt||0);
    [[col.phi, col.nBarras], [col.phi2, col.n2], [col.phi3, col.n3]].forEach(([ph, nb]) => { if (ph && nb) pz(+ph, lBarra(h, +ph, 1), (+col.cantElem||0)*nb, 'col'); });
    const nE = h > 0 ? CEIL(h/((+col.sepEstr||150)/1000) - 1e-9) + 1 : 0;
    const tipo = col.estribType || 1;
    const r = col.recub ?? 2, q = v => Math.max(Math.round(v*10)/10, 1), Ae = A - 2*r, Be = Bb - 2*r, g = gancho(col.phiEstr, col.gancho);
    let largo = null;
    if (!col.estriboManual) {
      if (tipo === 1) largo = 2*(q(Ae)+q(Be))/100 + g;
      else if (tipo === 2) largo = 2*(q(Ae)+q(Be))/100 + g + q(Be)/100 + g;                 // trabante: una barra del alto, 2 ganchos
      else if (tipo === 3) largo = 2*(q(Ae)+q(Be))/100 + g + 2*(q(Math.round(Ae*0.48))+q(Math.round(Be*0.82)))/100 + g;
      else if (tipo === 7) largo = 4*q(Ae)/100 + g;
    }
    if (largo != null) pz(+col.phiEstr, largo, (+col.cantElem||0)*nE, 'col-estr');
    else out.colPorTipoEstr[tipo] = (out.colPorTipoEstr[tipo]||0) + 1;
  });
  out.col = {vol: colVol, tipo: colTipo};

  // ── VIGAS ──
  const vigTipo = {}; let vigVolReal = 0;
  ['vigas_vf', 'vigas_vd'].forEach(key => (snap[key] || []).forEach(v => {
    const L = +v.longLibre || 0, an = (+v.ancho||20)/100, al = (+v.alto||20)/100;
    let vol = an*al*L;
    if (key === 'vigas_vf' && v.zapata) {
      const zA = +v.zAncho || 60, zH = +v.zAlto || 25, zv = zA/100*zH/100*L;
      vol = (v.zHorm||'zapata') === 'suma' ? vol + zv : zv;
      const phiT = +v.zPhiT || 6, phiL = +v.zPhiL || 8, man = x => x!=null && x!=='' && isFinite(+x);
      const recto = man(v.zLR) ? +v.zLR : Math.max(zA - 8, 1), gz = man(v.zPata) ? +v.zPata : phiT;
      pz(phiT, (recto + 2*gz)/100, CEIL(L*100/Math.max(+v.zSepT||20, 5)) + 1, 'zap');
      pz(phiL, lBarra(L, phiL, 2), 2*Math.min(Math.max(+v.zNL||1,1),3), 'zap');
    }
    vigVolReal += vol;
    const t = v.techoLiviano ? 'obra' : (v.hormTipo || 'H17');
    vigTipo[t] = (vigTipo[t]||0) + vol*(v.techoLiviano ? 1.5 : 1);
    [[v.phi||10, v.nBarras], [v.phi2, v.n2], [v.phi3, v.n3]].forEach(([ph, nb]) => { if (ph && nb) pz(+ph, lBarra(L, +ph, 2), +nb, 'vig'); });
    const nE = L > 0 ? CEIL(L/((+v.sepEstr||20)/100) - 1e-9) + 1 : 0;
    if ((v.estribType||1) === 1 && !v.estriboManual) {
      const r = v.recub ?? 2, ea = Math.max(Math.round(((+v.ancho||20) - 2*r)*10)/10, 1), eb = Math.max(Math.round(((+v.alto||20) - 2*r)*10)/10, 1);
      pz(+v.phiEstr, 2*(ea+eb)/100 + gancho(v.phiEstr, v.gancho), nE, 'vig-estr');
    } else out.notas.push('viga con estribo no rectangular simple: no recalculado');
  }));
  out.vig = {porTipo: vigTipo, volReal: vigVolReal};

  // ── BASES ──
  const basTipo = {}; let basVol = 0;
  (snap.bases || []).forEach(b => {
    const v = (+b.cant||0)*(+b.ancho||0)*(+b.largo||0)*(+b.alto||0); basVol += v;
    const t = b.hormTipo || 'H17'; basTipo[t] = (basTipo[t]||0) + v;
    const phX = +b.phi || 8, sX = +b.sep || 150, phY = +b.phi2 || phX, sY = +b.sep2 || sX;
    pz(phX, Math.max((+b.ancho||0) - 0.08, 0.05) + 0.02*phX, (CEIL((+b.largo||0)/(sX/1000)) + 1)*(+b.cant||0), 'base');
    pz(phY, Math.max((+b.largo||0) - 0.08, 0.05) + 0.02*phY, (CEIL((+b.ancho||0)/(sY/1000)) + 1)*(+b.cant||0), 'base');
  });
  const kgM3 = t => ({H8:200,H13:250,H17:300,H21:330,H25:380})[t] || hf.cemKg;
  const basHid = C['bas-hidro-chk'] ? Object.entries(basTipo).reduce((s,[t,v]) => s + v*kgM3(t)*num(F['bas-hidro-pct'],2)/100, 0) : 0;
  out.bases = {porTipo: basTipo, vol: basVol, hidro: basHid};

  // ── CIMIENTOS ──
  const cv = f('cim-largo')*f('cim-ancho')*f('cim-alto'), cic = (F['cim-tipo']||'ciclopeo') === 'ciclopeo';
  const cimT = (F['cim-horm-tipo'] === 'mano' ? 'obra' : F['cim-horm-tipo']) || 'obra';
  const cimH = cic ? cv*0.55 : cv;
  out.cim = {vol: cv, horm: cimH, piedra: cic ? cv*0.45 : 0, tipo: cimT,
    hidro: C['cim-hidro-chk'] && cimH > 0 ? cimH*kgM3(cimT)*num(F['cim-hidro-pct'],2)/100 : 0};

  // ── MAMPOSTERÍA ──
  const mz = mort('mamp');
  // Definición 30/09: sin desperdicio propio; el % de la pestaña (o el general)
  const pTab = t => { const v = parseFloat(F['pct-'+t]); return isFinite(v) && v >= 0 ? v/100 : f('res-pct')/100; };
  const desp = pTab('mamp'), despM = 0;
  const ARM = {on:false, cada:4, nBar:2, phi:6, phiC:4.2, sepC:50, cem:1, are:3};
  const muros = [{titulo:'Muro principal', lad:(F['mamp-lad-nombre']||'').trim()||'Ladrillón', esp:f('lad-esp')||0.17, largo:f('lad-largo')||0.25,
    alto:f('lad-alto')||0.06, junta:f('lad-junta')||0.03, sup:Object.fromEntries(area('mamp').map(n => [n.k, f('mamp-sup-'+n.suf)])),
    hil:f('mamp-hid-hil'), lM:f('mamp-hid-largo'), arm:{...ARM, ...(snap.mampArmP||{})}},
    ...(snap.murosExtra || []).map(m => ({titulo:m.titulo, lad:m.ladNombre, esp:+m.esp||0.17, largo:+m.largo||0.25, alto:+m.alto||0.06,
      junta:+m.junta>=0 ? +m.junta : 0.03, sup:m.sup||{}, hil:+m.hil||0, lM:+m.lMuros||0, arm:{...ARM, ...(m.arm||{})}}))];
  const mamp = {lad:0, ladNet:0, ladExacto:0, alb:0, port:0, cal:0, arena:0, hidro:0, porLad:{}};
  const mzH = mezcla({cem: f('mamp-hid-cem') || 1, are: f('mamp-hid-are')});
  let P0 = null;
  muros.forEach((m, i) => {
    const lpm = 1/((m.largo + m.junta)*(m.alto + m.junta));
    const mm2 = Math.max(0, m.esp - lpm*m.largo*m.alto*m.esp)*(1 + despM);
    if (i === 0) P0 = {mm2, esp:m.esp, alto:m.alto, junta:m.junta};
    const sups = area('mamp').map(n => ({k:n.k, s:+m.sup[n.k]||0})).filter(x => x.s > 0);
    const tot = sups.reduce((s,x) => s + x.s, 0);
    const net = CEIL(tot*lpm), conD = CEIL(net*(1 + desp));
    mamp.ladNet += net; mamp.lad += conD; mamp.ladExacto += tot*lpm; mamp.porLad[m.lad] = (mamp.porLad[m.lad]||0) + tot*lpm;
    const supH = Math.min(+m.sup.PB||0, Math.max(Math.floor(m.hil),0)*(m.alto + m.junta)*Math.max(m.lM,0));
    const mortH = supH*mm2;
    const comunT = Math.max(tot*mm2 - mortH, 0);
    const A = m.arm.on ? m.arm : null, fr = A ? 1/Math.max(Math.round(+A.cada||4),1) : 0;
    const comun = comunT*(1 - fr), mortA = comunT*fr;
    mamp.alb += comun*mz.r.alb; mamp.cal += comun*mz.r.cal; mamp.port += comun*mz.r.port; mamp.arena += comun*mz.r.arena;
    mamp.port += mortH*mzH.port; mamp.arena += mortH*mzH.arena; mamp.hidro += mortH*mzH.port*acM/(Math.max(f('mamp-hid-dil'),0.1)||10);
    if (A) {
      const mA = mezcla({cem:+A.cem||1, are:+A.are>=0 ? +A.are : 3});
      mamp.port += mortA*mA.port; mamp.arena += mortA*mA.arena;
      sups.forEach(x => {
        const mlH = x.s/(m.alto + m.junta)*fr;
        entera(+A.phi||6, mlH*Math.max(Math.round(+A.nBar||2),1)*1.10, 'mamp-arm');
        pz(+A.phiC||4.2, Math.max(m.esp - 0.04, 0.05) + 0.02*(+A.phiC||4.2), CEIL(mlH/(Math.max(+A.sepC||50,5)/100) - 1e-9), 'mamp-C');
      });
    }
  });
  // Antepechos
  const AM = {cem:1, are:3, ...(snap.antepMort||{})}, mzAnt = mezcla({cem:+AM.cem||1, are:+AM.are>=0 ? +AM.are : 3});
  (snap.antepechos || []).filter(x => +x.ml > 0).forEach(x => {
    const esp = +x.esp || P0.esp, mlA = +x.ml, vol = mlA*P0.mm2*(esp/P0.esp)*(P0.alto + P0.junta);
    mamp.alb -= vol*mz.r.alb; mamp.cal -= vol*mz.r.cal; mamp.port += vol*(mzAnt.port - mz.r.port); mamp.arena += vol*(mzAnt.arena - mz.r.arena);
    entera(+x.phi||8, mlA*Math.max(Math.round(+x.nBar||2),1)*1.10, 'ant');
    pz(+x.phiC||4.2, Math.max(esp - 0.04, 0.05) + 0.02*(+x.phiC||4.2), CEIL(mlA/(Math.max(+x.sepC||30,5)/100) - 1e-9) + 1, 'ant-C');
  });
  mamp.alb = Math.max(mamp.alb, 0); mamp.cal = Math.max(mamp.cal, 0);
  out.mamp = mamp;

  // ── REVOQUES ──
  const rev = {port:0, cal:0, alb:0, yeso:0, arenaG:0, arenaF:0, hidro:0};
  const hidC = Math.max(f('rev-hid-cem'),0) || 1, hidA = Math.max(f('rev-hid-are'),0), hidD = Math.max(f('rev-hid-dil'),0.1) || 10;
  const mzRH = mezcla({cem:hidC, are:hidA});
  [['gi','rg-int',1,'rev-hid-int',2.5], ['ge','rg-ext',1,'rev-hid-ext',2.5], ['fi','rf-int',0,null,0.5], ['fe','rf-ext',0,null,0.5], ['cg','crg',1,null,1.5], ['cr','cr',0,null,1]]
    .forEach(([k, pre, grueso, pctId, eDef]) => {
      const m = mort(k), ev = parseFloat(F['rev-esp-'+k]), e = (isFinite(ev) && ev >= 0 ? ev : eDef)/100;
      area('rev').forEach(nv => {
        const s = f(`${pre}-${nv.suf}`); if (!(s > 0)) return;
        const pct = (grueso && pctId && nv.k === 'PB') ? Math.min(Math.max(f(pctId),0),100)/100 : 0;
        const sH = s*pct, sN = s - sH, v = sN*e;
        rev.port += v*m.r.port; rev.cal += v*m.r.cal; rev.alb += v*m.r.alb; rev.yeso += v*m.r.yeso;
        if (grueso) rev.arenaG += v*m.r.arena; else rev.arenaF += v*m.r.arena;
        rev.port += sH*e*mzRH.port; rev.arenaG += sH*e*mzRH.arena; rev.hidro += sH*e*mzRH.port*acM/hidD;
      });
    });
  out.rev = rev;

  // ── CONTRAPISO ──
  const ec = f('carp-esp')/100, ct = F['cont-horm-tipo'] || 'obra';
  const cont = {cem:0, arena:0, ripio:0, elab:{}}; const mCarp = mezcla({cem:1, are:3});
  const filaCp = (s, esp, sC, t, armMl, armPhi) => {
    const vol = s*esp;
    if (t === 'obra') { cont.cem += vol*hf.cemKg; cont.arena += vol*hf.arena; cont.ripio += vol*hf.piedra; }
    else if (vol > 0) cont.elab[t] = (cont.elab[t]||0) + vol;
    cont.cem += sC*ec*mCarp.port; cont.arena += sC*ec*mCarp.arena;
    if (armMl > 0) entera(armPhi, armMl, 'cp');
  };
  const cpPhi = {};
  area('cp').forEach(nv => {
    const s = f('cp-sup-'+nv.suf), ph = parseFloat(F['cp-arm-phi-'+nv.suf]) || 0, sep = Math.max(parseFloat(F['cp-arm-sep-'+nv.suf]) || 150, 25), capas = +(F['cp-arm-capas-'+nv.suf]) || 1;
    const armMl = ph ? s*(2/(sep/1000))*capas*1.10 : 0;
    filaCp(s, f('cp-esp-'+nv.suf)/100, f('carp-sup-'+nv.suf), ct, 0);
    if (armMl > 0) cpPhi[ph] = (cpPhi[ph]||0) + armMl;
  });
  const cpMalla = {};
  (snap.cpSectores || []).forEach(sx => {
    const s = +sx.sup||0, capas = +sx.capas||1, arm = sx.arm || 'no';
    const ph = arm === 'hierro' ? (+sx.phi||6) : 0, sep = Math.max(+sx.sep||150, 25);
    filaCp(s, (+sx.esp||0)/100, +sx.supC||0, sx.horm || ct, 0);
    if (ph) cpPhi[ph] = (cpPhi[ph]||0) + s*(2/(sep/1000))*capas*1.10;
    if (arm === 'malla') cpMalla[sx.malla||'Q188'] = (cpMalla[sx.malla||'Q188']||0) + s*capas*1.10;
  });
  Object.entries(cpPhi).forEach(([ph, m]) => entera(+ph, m, 'cp'));       // la app junta por Ø antes de redondear
  out.cont = cont; out.cpMalla = cpMalla;

  // ── LOSAS ──
  const losa = {l12:0, l16:0, horm:{}, mallaM2:0};
  (snap.losas || []).forEach(l => {
    const nL = CEIL((+l.cant||0)*(+l.sup||0)*CEIL(1000/(+l.sep>0 ? +l.sep : 150)));
    if (+l.alt === 16) losa.l16 += nL; else losa.l12 += nL;
    const vc = (+l.cant||0)*(+l.sup||0)*((+l.capComp||7)/100), t = l.hormTipo || 'H17';
    losa.horm[t] = (losa.horm[t]||0) + vc;
    if (l.arm === 'hierro') entera(+l.phi, (+l.cant||0)*(+l.sup||0)*(2/((+l.sepArm||200)/1000))*1.10, 'losa');
    else losa.mallaM2 += (+l.cant||0)*(+l.sup||0)*1.10;
  });
  let macVol = 0;
  (snap.losas_macizas || []).forEach(l => {
    macVol += l.cant*l.ancho*l.largo*(l.alto/100);
    const nBX = CEIL(l.largo/(l.sepX/1000)) + 1, nBY = CEIL(l.ancho/(l.sepY/1000)) + 1;
    const Lb = (luz, ph) => +luz > 0 ? +luz + 2*(0.15 + 12*ph/1000) : 0;
    if (+l.phiX) pz(+l.phiX, Lb(l.ancho, +l.phiX), Math.round(l.cant*nBX*l.factor), 'mac');
    if (+l.phiY) pz(+l.phiY, Lb(l.largo, +l.phiY), Math.round(l.cant*nBY*l.factor), 'mac');
  });
  out.losa = losa; out.macVol = macVol;

  // ── CUBIERTA ──
  const secs = (snap.techoSectores || []).filter(s => +s.sup > 0);
  const tSup = secs.length ? secs.reduce((s,x) => s + (+x.sup||0), 0) : f('techo-sup');
  const tTipo = F['techo-aislacion'] || '1', ins = tTipo === '1' ? 'pomeca' : tTipo === '2' ? 'perlita' : '';
  const eA = Math.max(f('techo-ais-esp'),0), eC = Math.max(f('techo-carp-esp'),0), es = (v, d) => (v===''||v==null) ? d : Math.max(+v||0, 0);
  const zonas = secs.length ? secs.map(s => ({s:+s.sup||0, a:es(s.aisEsp,eA), c:es(s.carpEsp,eC)})) : [{s:tSup, a:eA, c:eC}];
  const vA = ins ? zonas.reduce((t,z) => t + z.s*z.a/100, 0) : 0, vC = zonas.reduce((t,z) => t + z.s*z.c/100, 0);
  const mA = mezcla({cem:f('techo-ais-cem'), alb:f('techo-ais-alb'), are:f('techo-ais-are'), liv:f('techo-ais-liv')});
  const mC = mezcla({cem:f('techo-carp-cem'), alb:f('techo-carp-alb'), are:f('techo-carp-are')});
  out.techo = {port: vA*mA.port + vC*mC.port, alb: vA*mA.alb + vC*mC.alb, arena: vA*mA.arena + vC*mC.arena, aisl: vA*mA.liv, ins,
    membranaM2: tSup/9*10, emulsion: tSup*0.9};

  // ── HORMIGÓN POR TIPO (toda la obra) ──
  const H = {}; const addH = (t, v) => { if (v > 0) H[t] = (H[t]||0) + v; };
  addH(colTipo, colVol); Object.entries(vigTipo).forEach(([t,v]) => addH(t, v)); Object.entries(basTipo).forEach(([t,v]) => addH(t, v));
  addH(cimT, cimH); Object.entries(cont.elab).forEach(([t,v]) => addH(t, v)); Object.entries(losa.horm).forEach(([t,v]) => addH(t, v)); addH('H17', macVol);
  out.H = H;
  const obra = H.obra || 0;

  // ── RESUMEN ESPERADO (neto, unidad base) ──
  const volHA = colVol + vigVolReal + basVol + macVol;
  out.resumen = {
    portland: obra*hf.cemKg + rev.port + cont.cem + mamp.port + out.techo.port,
    cemAlb: mamp.alb + rev.alb + out.techo.alb,
    cal: rev.cal + mamp.cal,
    yeso: rev.yeso,
    arenaG: obra*hf.arena + cont.arena + mamp.arena + rev.arenaG + out.techo.arena,
    arenaF: rev.arenaF,
    ripio: obra*hf.piedra + cont.ripio,
    piedra: out.cim.piedra,
    ladrillon: mamp.ladExacto,
    mallaSima: losa.mallaM2 + Object.values(cpMalla).reduce((a,b)=>a+b,0),
    loseta: losa.l12, loseta16: losa.l16,
    membrana: out.techo.membranaM2, emulsion: out.techo.emulsion,
    hidrofugo: rev.hidro + mamp.hidro, hidroMasa: basHid + out.cim.hidro,
    alambre14: volHA*3.5, alambre17: volHA*3.5, clavos2: volHA*1, clavos25: volHA*1,
    aisl: out.techo.aisl,
  };
  Object.entries(H).forEach(([t,v]) => { if (t !== 'obra') out.resumen['H:'+t] = v; });

  // ── HIERRO: metros y barras SIN optimizar (cada pieza de barras nuevas) ──
  out.hierroMl = ml;
  const sin = {};
  piezas.forEach(g => {
    let L = g.L, n = 0;
    if (g.entera) n = g.N;
    else { if (L > B + 1e-9) { const ll = Math.floor(L/B + 1e-9); n += ll*g.N; L = Math.round((L - ll*B)*1000)/1000; }
      if (L >= 0.01) n += CEIL(g.N/Math.floor(B/L + 1e-9)); }
    sin[g.phi] = (sin[g.phi]||0) + n;
  });
  out.barrasSin = sin; out.piezas = piezas;
  return out;
}
module.exports = {oraculo};
