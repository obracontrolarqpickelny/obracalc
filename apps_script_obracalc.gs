/**
 * ═══════════════════════════════════════════════════════════════════
 *  ObraCalc — respaldo en Drive (Google Apps Script) · versión 2
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Mismo criterio que ObraControl, ObraGestión y ObraCertif: una carpeta
 *  por obra, navegable desde Drive, con los datos que usa la app, copias
 *  legibles en CSV y un historial de lo guardado antes.
 *
 *  ObraCalc_Datos/
 *    └── Casa López/
 *          ├── datos.json                    ← versión "Principal"
 *          ├── version - Con losa maciza.json ← otras versiones de la obra
 *          ├── info.json                     ← ficha corta (nombre, fechas)
 *          ├── columnas.csv / vigas.csv / bases.csv / losas.csv  (Principal)
 *          └── historial/
 *                └── Principal · 2026-09-26 18.40.12.json   ← lo que había
 *                                                              antes de cada
 *                                                              guardado
 *
 *  Versión 2 agrega: versiones por obra, historial y restaurar.
 *  Es compatible con lo guardado por la versión 1 (datos.json = Principal).
 * ═══════════════════════════════════════════════════════════════════
 */

var SECRETO = 'obracalc-7b9b1555c4423a7a1e2061a0';
var CARPETA = 'ObraCalc_Datos';
var PRINCIPAL = 'Principal';
var MAX_HISTORIAL = 200;   // archivos por obra; se borran los más viejos

// ─── CARPETAS ──────────────────────────────────────────────────────

/** Nombre usable como carpeta o archivo en Drive. Conserva acentos. */
function _limpio(n) {
  return String(n || 'sin_nombre').replace(/[\/\\:*?"<>|]/g, '_').trim() || 'sin_nombre';
}

/** Carpeta raíz del sistema, en la raíz de tu Drive. */
function _raiz() {
  var it = DriveApp.getFoldersByName(CARPETA);
  return it.hasNext() ? it.next() : DriveApp.createFolder(CARPETA);
}

/** ObraCalc_Datos/<obra>/ — se crea si no existe (crear=true). */
function _carpetaObra(obraName, crear) {
  var raiz = _raiz(), nom = _limpio(obraName);
  var it = raiz.getFoldersByName(nom);
  if (it.hasNext()) return it.next();
  return crear === false ? null : raiz.createFolder(nom);
}

function _sub(carpeta, nombre) {
  var it = carpeta.getFoldersByName(nombre);
  return it.hasNext() ? it.next() : carpeta.createFolder(nombre);
}

function _archivo(carpeta, nombre) {
  var it = carpeta.getFilesByName(nombre);
  return it.hasNext() ? it.next() : null;
}

/** Reemplaza el archivo si ya estaba. */
function _escribir(carpeta, nombre, contenido, mime) {
  var viejo = _archivo(carpeta, nombre);
  if (viejo) viejo.setTrashed(true);
  return carpeta.createFile(Utilities.newBlob(contenido, mime || 'application/json', nombre));
}

function _json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── VERSIONES ─────────────────────────────────────────────────────

function _version(v) { v = String(v || '').trim(); return v || PRINCIPAL; }

/** Archivo de cada versión: Principal = datos.json (compatible con la v1). */
function _archivoVersion(v) {
  v = _version(v);
  return v === PRINCIPAL ? 'datos.json' : 'version - ' + _limpio(v) + '.json';
}

function _versionDeArchivo(nombre) {
  if (nombre === 'datos.json') return PRINCIPAL;
  var m = /^version - (.+)\.json$/.exec(nombre);
  return m ? m[1] : null;
}

function _sello() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'America/Argentina/San_Juan', 'yyyy-MM-dd HH.mm.ss');
}

/** Guarda en historial/ lo que había antes de pisarlo. */
function _alHistorial(carpeta, archivoViejo, version) {
  var hist = _sub(carpeta, 'historial');
  archivoViejo.makeCopy(_limpio(version) + ' · ' + _sello() + '.json', hist);
  // Poda: se quedan los MAX_HISTORIAL más nuevos
  var todos = [], it = hist.getFiles();
  while (it.hasNext()) { var f = it.next(); todos.push(f); }
  if (todos.length > MAX_HISTORIAL) {
    todos.sort(function (a, b) { return a.getDateCreated() - b.getDateCreated(); });
    for (var i = 0; i < todos.length - MAX_HISTORIAL; i++) todos[i].setTrashed(true);
  }
}

// ─── COPIAS LEGIBLES (CSV) ─────────────────────────────────────────

function _csv(filas) {
  return filas.map(function (f) {
    return f.map(function (c) {
      c = (c === null || c === undefined) ? '' : String(c);
      return /[",;\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c;
    }).join(';');
  }).join('\n');
}

function _csvColumnas(d) {
  var filas = [['Nivel', 'Denom.', 'Cant.', 'Ø ppal', 'N° barras', 'Ø2', 'N°2', 'Ø3', 'N°3',
                'Altura (m)', 'Forma', 'Secc. A (cm)', 'Secc. B (cm)', 'Recub. (cm)', 'Ø estribo', 'Sep. estribo (mm)', 'Tipo estribo']];
  (d.columnas || []).forEach(function (c) {
    filas.push([c.nivel || '', c.denom, c.cantElem, c.phi, c.nBarras, c.phi2 || 0, c.n2 || 0, c.phi3 || 0, c.n3 || 0,
                c.alt, c.forma || '', c.secA, c.secB, c.recub == null ? 2 : c.recub, c.phiEstr, c.sepEstr, c.estribType || 1]);
  });
  return _csv(filas);
}

function _csvVigas(d) {
  var filas = [['Tipo', 'Nivel', 'Denom.', 'Ø ppal', 'N° barras', 'Ø2', 'N°2', 'Luz libre (m)',
                'Ancho (cm)', 'Alto (cm)', 'Recub. (cm)', 'Ø estribo', 'Sep. estribo (cm)', 'H° tipo', 'Techo liviano']];
  (d.vigas_vf || []).forEach(function (v) {
    filas.push(['VF/VA', '', v.denom, v.phi, v.nBarras, v.phi2 || 0, v.n2 || 0, v.longLibre,
                v.ancho, v.alto, v.recub == null ? 2 : v.recub, v.phiEstr, v.sepEstr, v.hormTipo || 'H17', v.techoLiviano ? 'sí' : 'no']);
  });
  (d.vigas_vd || []).forEach(function (v) {
    filas.push(['VD/VE/VC', v.nivel || '', v.denom, v.phi, v.nBarras, v.phi2 || 0, v.n2 || 0, v.longLibre,
                v.ancho, v.alto, v.recub == null ? 2 : v.recub, v.phiEstr, v.sepEstr, v.hormTipo || 'H17', v.techoLiviano ? 'sí' : 'no']);
  });
  return _csv(filas);
}

function _csvBases(d) {
  var filas = [['Denom.', 'Cant.', 'Ancho (m)', 'Largo (m)', 'Alto (m)', 'Ø ppal', 'Sep. (mm)', 'Ø2', 'Sep.2 (mm)', 'H° tipo']];
  (d.bases || []).forEach(function (b) {
    filas.push([b.denom, b.cant, b.ancho, b.largo, b.alto, b.phi, b.sep, b.phi2 || 0, b.sep2 || 0, b.hormTipo || 'H17']);
  });
  return _csv(filas);
}

function _csvLosas(d) {
  var filas = [['Tipo', 'Denom.', 'Cant.', 'Superficie (m²)', 'Ancho (m)', 'Largo (m)', 'Espesor (cm)', 'Ø malla', 'Sep. (mm)', 'H° tipo']];
  (d.losas || []).forEach(function (l) {
    filas.push(['Pretensada', l.denom, l.cant, l.sup, '', '', l.alt, l.phi, l.sep, l.hormTipo || 'H17']);
  });
  (d.losas_macizas || []).forEach(function (l) {
    filas.push(['Maciza', l.denom, l.cant, '', l.ancho, l.largo, l.alto, l.phiX, l.sepX, '']);
  });
  return _csv(filas);
}

/** Ficha corta. La lista de obras la lee de acá y no del JSON completo. */
function _info(carpeta, d, version) {
  var f = d.fields || {}, prev = {};
  try { var a = _archivo(carpeta, 'info.json'); if (a) prev = JSON.parse(a.getBlob().getDataAsString()) || {}; } catch (e) {}
  var versiones = prev.versiones || {};
  versiones[_version(version)] = new Date().toISOString();
  return {
    proyecto: prev.proyecto || f['obra-nombre'] || '',
    propietario: f['obra-prop'] || prev.propietario || '',
    actualizado: new Date().toISOString(),
    versiones: versiones,
    columnas: (d.columnas || []).length,
    vigas: (d.vigas_vf || []).length + (d.vigas_vd || []).length,
    bases: (d.bases || []).length,
    losas: (d.losas || []).length + (d.losas_macizas || []).length
  };
}

// ─── GUARDAR ───────────────────────────────────────────────────────

function doPost(e) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch (err) {
    return _json({ ok: false, error: 'Servidor ocupado.' });
  }
  try {
    var body = JSON.parse(e.postData.contents);
    if (String(body.secreto || '') !== SECRETO)
      return _json({ ok: false, error: 'Clave incorrecta.' });

    var d = body.data || {};
    var obraName = String(body.obraName || (d.fields && d.fields['obra-nombre']) || 'sin_nombre');
    var version = _version(body.version);
    var carpeta = _carpetaObra(obraName);
    var nombreArch = _archivoVersion(version);

    // Lo que había antes pasa al historial (así nunca se pierde un guardado)
    // Lo que había antes pasa al historial: siempre en 💾 Guardar (hito) y, en la
    // sincronización automática (cada pocos segundos), como mucho una copia cada 30 min.
    var viejo = _archivo(carpeta, nombreArch);
    var props = PropertiesService.getScriptProperties();
    var claveH = 'hist_' + carpeta.getId() + '_' + _limpio(version);
    var ultH = +(props.getProperty(claveH) || 0);
    if (viejo && (body.hito || Date.now() - ultH > 30 * 60 * 1000)) {
      try { _alHistorial(carpeta, viejo, version); props.setProperty(claveH, String(Date.now())); }
      catch (err) { console.error('historial: ' + err); }
    }

    _escribir(carpeta, nombreArch, JSON.stringify(d));
    var info = _info(carpeta, d, version);
    if (!info.proyecto) info.proyecto = obraName;
    _escribir(carpeta, 'info.json', JSON.stringify(info));
    // CSV legibles de la versión Principal. Si algo falla, el respaldo ya quedó arriba.
    if (version === PRINCIPAL) {
      try {
        _escribir(carpeta, 'columnas.csv', _csvColumnas(d), 'text/csv');
        _escribir(carpeta, 'vigas.csv', _csvVigas(d), 'text/csv');
        _escribir(carpeta, 'bases.csv', _csvBases(d), 'text/csv');
        _escribir(carpeta, 'losas.csv', _csvLosas(d), 'text/csv');
      } catch (err) { console.error('csv: ' + err); }
    }

    return _json({ ok: true, guardado: carpeta.getName(), version: version, fecha: new Date().toISOString() });
  } catch (err) {
    return _json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// ─── LEER ──────────────────────────────────────────────────────────

function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    var accion = p.action || 'ping';
    if (String(p.secreto || '') !== SECRETO)
      return _json({ ok: false, error: 'Clave incorrecta.' });

    if (accion === 'ping')
      return _json({ ok: true, mensaje: 'ObraCalc Drive API activa', version: 2 });

    if (accion === 'load') {
      var c1 = _carpetaObra(p.obra, false);
      if (c1) {
        var f = _archivo(c1, _archivoVersion(p.version));
        if (f) return _json({ ok: true, data: JSON.parse(f.getBlob().getDataAsString()) });
      }
      return _json({ ok: false, error: 'Obra no encontrada.' });
    }

    if (accion === 'list') {
      var raiz = _raiz(), obras = [];
      var carpetas = raiz.getFolders();
      while (carpetas.hasNext()) {
        var c = carpetas.next(), nombre = c.getName();
        try {
          var inf = _archivo(c, 'info.json');
          if (inf) {
            var i = JSON.parse(inf.getBlob().getDataAsString());
            if (i && i.proyecto) nombre = i.proyecto;
          }
        } catch (err) {}
        var versiones = [], fs = c.getFiles();
        while (fs.hasNext()) {
          var a = fs.next(), v = _versionDeArchivo(a.getName());
          if (v) versiones.push({ nombre: v, actualizado: a.getLastUpdated().toISOString() });
        }
        versiones.sort(function (x, y) { return x.nombre === PRINCIPAL ? -1 : y.nombre === PRINCIPAL ? 1 : x.nombre.localeCompare(y.nombre); });
        if (versiones.length) obras.push({ nombre: nombre, carpeta: c.getName(), versiones: versiones });
      }
      return _json({ ok: true, obras: obras });
    }

    if (accion === 'historial') {
      var c2 = _carpetaObra(p.obra, false);
      if (!c2) return _json({ ok: false, error: 'Obra no encontrada.' });
      var pref = _limpio(_version(p.version)) + ' · ', archivos = [];
      var hi = c2.getFoldersByName('historial');
      if (hi.hasNext()) {
        var it = hi.next().getFiles();
        while (it.hasNext()) {
          var h = it.next();
          if (h.getName().indexOf(pref) === 0)
            archivos.push({ archivo: h.getName(), fecha: h.getDateCreated().toISOString() });
        }
      }
      archivos.sort(function (x, y) { return y.fecha.localeCompare(x.fecha); });
      return _json({ ok: true, archivos: archivos.slice(0, 60) });
    }

    if (accion === 'loadHist') {
      var c3 = _carpetaObra(p.obra, false);
      if (c3) {
        var hh = c3.getFoldersByName('historial');
        if (hh.hasNext()) {
          var fh = _archivo(hh.next(), String(p.archivo || ''));
          if (fh) return _json({ ok: true, data: JSON.parse(fh.getBlob().getDataAsString()) });
        }
      }
      return _json({ ok: false, error: 'Versión no encontrada.' });
    }

    return _json({ ok: false, error: 'Acción desconocida: ' + accion });
  } catch (err) {
    return _json({ ok: false, error: String(err) });
  }
}
