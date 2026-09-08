/**
 * ═══════════════════════════════════════════════════════════════════
 *  ObraCalc — respaldo en Drive (Google Apps Script)
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Mismo criterio que ObraControl y ObraGestión: una carpeta por obra,
 *  navegable desde Drive, con los datos que usa la app más copias legibles
 *  para abrir a mano (columnas, vigas, bases y losas en CSV).
 *
 *  ObraCalc_Datos/
 *    └── Ampliacion Femenia Ruiz/
 *          ├── datos.json      ← lo que lee y escribe la app (captureSnapshot)
 *          ├── info.json       ← ficha corta (nombre real, fecha, cantidades)
 *          ├── columnas.csv
 *          ├── vigas.csv
 *          ├── bases.csv
 *          └── losas.csv
 * ═══════════════════════════════════════════════════════════════════
 */

var SECRETO = 'obracalc-7b9b1555c4423a7a1e2061a0';
var CARPETA = 'ObraCalc_Datos';

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

/** ObraCalc_Datos/<obra>/ — se crea si no existe. */
function _carpetaObra(obraName) {
  var raiz = _raiz(), nom = _limpio(obraName);
  var it = raiz.getFoldersByName(nom);
  return it.hasNext() ? it.next() : raiz.createFolder(nom);
}

function _archivo(carpeta, nombre) {
  var it = carpeta.getFilesByName(nombre);
  return it.hasNext() ? it.next() : null;
}

/** Reemplaza el archivo si ya estaba, para no acumular versiones. */
function _escribir(carpeta, nombre, contenido, mime) {
  var viejo = _archivo(carpeta, nombre);
  if (viejo) viejo.setTrashed(true);
  return carpeta.createFile(Utilities.newBlob(contenido, mime || 'application/json', nombre));
}

function _json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
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
  var filas = [['Denom.', 'Cant.', 'Ø ppal', 'N° barras', 'Ø2', 'N°2', 'Ø3', 'N°3',
                'Altura (m)', 'Secc. A (cm)', 'Secc. B (cm)', 'Ø estribo', 'Sep. estribo (mm)', 'Tipo estribo']];
  (d.columnas || []).forEach(function (c) {
    filas.push([c.denom, c.cantElem, c.phi, c.nBarras, c.phi2 || 0, c.n2 || 0, c.phi3 || 0, c.n3 || 0,
                c.alt, c.secA, c.secB, c.phiEstr, c.sepEstr, c.estribType || 1]);
  });
  return _csv(filas);
}

function _csvVigas(d) {
  var filas = [['Tipo', 'Denom.', 'Ø ppal', 'N° barras', 'Ø2', 'N°2', 'Luz libre (m)',
                'Ancho (cm)', 'Alto (cm)', 'Ø estribo', 'Sep. estribo (mm)', 'H° tipo', 'Techo liviano']];
  (d.vigas_vf || []).forEach(function (v) {
    filas.push(['VF/VA', v.denom, v.phi, v.nBarras, v.phi2 || 0, v.n2 || 0, v.longLibre,
                v.ancho, v.alto, v.phiEstr, v.sepEstr, v.hormTipo || 'H17', v.techoLiviano ? 'sí' : 'no']);
  });
  (d.vigas_vd || []).forEach(function (v) {
    filas.push(['VD/VE/VC', v.denom, v.phi, v.nBarras, v.phi2 || 0, v.n2 || 0, v.longLibre,
                v.ancho, v.alto, v.phiEstr, v.sepEstr, v.hormTipo || 'H17', v.techoLiviano ? 'sí' : 'no']);
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
function _info(d) {
  var f = d.fields || {};
  return {
    proyecto: f['obra-nombre'] || '',
    propietario: f['obra-prop'] || '',
    actualizado: new Date().toISOString(),
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
    var carpeta = _carpetaObra(obraName);

    _escribir(carpeta, 'datos.json', JSON.stringify(d));
    _escribir(carpeta, 'info.json', JSON.stringify(_info(d)));
    // Si algo falla al armar los CSV, el respaldo real ya quedó guardado arriba
    try {
      _escribir(carpeta, 'columnas.csv', _csvColumnas(d), 'text/csv');
      _escribir(carpeta, 'vigas.csv', _csvVigas(d), 'text/csv');
      _escribir(carpeta, 'bases.csv', _csvBases(d), 'text/csv');
      _escribir(carpeta, 'losas.csv', _csvLosas(d), 'text/csv');
    } catch (err) { console.error('csv: ' + err); }

    return _json({ ok: true, guardado: carpeta.getName(), fecha: new Date().toISOString() });
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
      return _json({ ok: true, mensaje: 'ObraCalc Drive API activa', version: 1 });

    if (accion === 'load') {
      var raiz = _raiz();
      var it = raiz.getFoldersByName(_limpio(p.obra));
      if (it.hasNext()) {
        var f = _archivo(it.next(), 'datos.json');
        if (f) return _json({ ok: true, data: JSON.parse(f.getBlob().getDataAsString()) });
      }
      return _json({ ok: false, error: 'Obra no encontrada.' });
    }

    if (accion === 'list') {
      var raiz2 = _raiz(), obras = [];
      var carpetas = raiz2.getFolders();
      while (carpetas.hasNext()) {
        var c = carpetas.next(), nombre = c.getName();
        try {
          var inf = _archivo(c, 'info.json');
          if (inf) {
            var i = JSON.parse(inf.getBlob().getDataAsString());
            if (i && i.proyecto) nombre = i.proyecto;
          }
        } catch (err) {}
        obras.push(nombre);
      }
      return _json({ ok: true, obras: obras });
    }

    return _json({ ok: false, error: 'Acción desconocida: ' + accion });
  } catch (err) {
    return _json({ ok: false, error: String(err) });
  }
}
