// Escenarios de prueba (se aplican sobre la obra de ejemplo de la app)
const set = (d, id, v) => { const e = d.getElementById(id); if (e) e.value = v; };
const chk = (d, id, v) => { const e = d.getElementById(id); if (e) e.checked = v; };
module.exports = {
  // Carpeta con cal, separaciones distintas por fila
  variantes: (w, d, S) => { set(d,'carp-mort-tipo','1'); set(d,'mz-carp-t1-cem',1); set(d,'mz-carp-t1-cal',0.5); set(d,'mz-carp-t1-are',4);
    S.columnas[0].sepEstr = 200; S.vigas_vd[0].sepEstr = 15; S.columnas[1].altT = 1.0; },
  base: () => {},
  filas: (w, d, S) => {
    w.addColumna(); const c = S.columnas.at(-1); Object.assign(c, {cantElem:3, secA:25, secB:40, phi:16, nBarras:6, alt:3.2, altT:4.6, phiEstr:8, sepEstr:120, estribType:1});
    w.removeCol && (w.confirm = () => true, w.removeCol(S.columnas[2].id));
    w.duplicarViga('vd', S.vigas_vd[0].id); w.duplicarBase(S.bases[1].id);
    const x = S.vigas_vf.shift(); S.vigas_vf.push(x);                       // reordenar
    d.getElementById('col-nivel-filtro').value = 'PA'; d.getElementById('vd-nivel-filtro').value = 'PB';  // filtros de vista
    w.addLosa(); Object.assign(S.losas.at(-1), {cant:2, sup:12.5, alt:16, sep:150, capComp:5, hormTipo:'H21'});
    w.agregarMuro(); Object.assign(S.murosExtra.at(-1), {sup:{PB:22.5}});
  },
  obra: (w, d, S) => { set(d,'col-horm-tipo','obra'); [...S.vigas_vf, ...S.vigas_vd].forEach(v=>v.hormTipo='obra'); S.bases.forEach(b=>b.hormTipo='obra');
    set(d,'cim-horm-tipo','obra'); set(d,'cont-horm-tipo','obra'); S.losas.forEach(l=>l.hormTipo='obra'); },
  elab: (w, d, S) => { set(d,'col-horm-tipo','H21'); [...S.vigas_vf, ...S.vigas_vd].forEach(v=>{v.hormTipo='H21'; v.techoLiviano=false;});
    S.bases.forEach(b=>b.hormTipo='H25'); set(d,'cim-horm-tipo','H13'); set(d,'cim-tipo','nociclopeo'); set(d,'cont-horm-tipo','H17');
    chk(d,'bas-hidro-chk',true); chk(d,'cim-hidro-chk',true); },
  // Todo encendido: mezclas con cal, revoques hidrófugos, cielorrasos, muros extra armados, antepechos,
  // sectores de contrapiso, losas con hierro, zapata, techo liviano, niveles extra, sin optimizar.
  completo: (w, d, S) => {
    set(d,'mamp-mort-tipo','1'); set(d,'rev-opc-gi','1'); set(d,'rev-opc-fe','3'); set(d,'cr-mort-tipo','4'); set(d,'cg-mort-tipo','1');
    set(d,'rev-hid-int', 30); set(d,'rev-hid-ext', 100); set(d,'crg-pb', 40); set(d,'cr-pb', 40); set(d,'crg-pa', 25);
    set(d,'mamp-hid-hil', 3); set(d,'mamp-hid-largo', 60);
    w.armDe(0).on = true; Object.assign(w.armDe(0), {cada:3, nBar:2, phi:8, phiC:6, sepC:40, cem:1, are:4});
    S.murosExtra = [{id:1, titulo:'Muro 0,10', ladNombre:'Hueco 8', esp:0.10, largo:0.33, alto:0.18, junta:0.015, sup:{PB:40, PA:20}, hil:2, lMuros:30, arm:{on:true, cada:2, nBar:2, phi:6, phiC:4.2, sepC:50, cem:1, are:3}},
                    {id:2, titulo:'Muro 0,30', ladNombre:'Ladrillón doble', esp:0.30, largo:0.25, alto:0.06, junta:0.03, sup:{PB:15}, hil:0, lMuros:0}];
    S.antepechos = [{id:1, nivel:'PB', ml:18, nBar:2, phi:8, phiC:4.2, sepC:30, esp:''}, {id:2, nivel:'PA', ml:9.5, nBar:3, phi:10, phiC:6, sepC:25, esp:0.2}];
    S.cpSectores = [{id:1, nombre:'Garaje', nivel:'PB', sup:30, esp:12, supC:30, horm:'H21', arm:'hierro', malla:'Q188', phi:8, sep:150, capas:2},
                    {id:2, nombre:'Vereda', nivel:'PB', sup:12, esp:10, supC:0, horm:'', arm:'malla', malla:'Q131', phi:6, sep:150, capas:1}];
    set(d,'cp-arm-phi-pb','6'); set(d,'cp-arm-sep-pb','200');
    S.losas[0].arm = 'hierro'; S.losas[0].phi = 6; S.losas[0].sepArm = 200; S.losas[1].hormTipo = 'obra'; S.losas[2].alt = 16;
    S.vigas_vf[0].techoLiviano = true; S.vigas_vf[1].zapata = true; S.vigas_vf[1].zHorm = 'suma'; S.vigas_vf[1].zNL = 2;
    S.columnas[0].altT = 4.4; S.columnas[1].phi2 = 8; S.columnas[1].n2 = 2;
    S.bases[0].hormTipo = 'obra'; chk(d,'bas-hidro-chk',true); chk(d,'cim-hidro-chk',true);
    S.techoSectores = [{id:1, nombre:'Losa', sup:80, aisEsp:'', carpEsp:''}, {id:2, nombre:'Galería', sup:25, aisEsp:8, carpEsp:3}];
    w.renderTechoSectores && w.renderTechoSectores();
    S.nivelesExtra = [{k:'N4', corto:'Terraza', largo:'Terraza', color:'#e05c5c'}, {k:'N5', corto:'Garage', largo:'Garage', color:'#14b8a6', solo:'cp'}];
    w.construirNivelesExtra(); set(d,'cp-sup-n5', 20); set(d,'cp-esp-n5', 15); set(d,'mamp-sup-n4', 10); set(d,'rg-ext-n4', 10);
    S.nivOcultos = {rev:['PA']};
    const c = d.getElementById('rec-optimizar'); if (c) c.checked = false;
  },
};
