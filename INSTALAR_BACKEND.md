# Instalar el respaldo en Drive de ObraCalc

Con esto, cada obra que guardes en ObraCalc queda además respaldada en tu
Google Drive, en carpetas navegables. Es gratis y se hace una sola vez.

Tiempo estimado: 5 minutos.

---

## Paso 1 — Crear el proyecto

1. Entrá a **https://script.google.com** con la cuenta de Google donde querés
   que se guarden los respaldos.
2. Tocá **Nuevo proyecto**.
3. Borrá todo el código que aparece (el `function myFunction() {}`).
4. Abrí el archivo `apps_script_obracalc.gs` de esta carpeta, copiá **todo**
   su contenido y pegalo ahí.
5. Arriba a la izquierda, ponele de nombre `ObraCalc Servidor`.
6. Guardá con `Ctrl+S`.

La clave secreta ya viene puesta en el código (línea 20, `var SECRETO = '...'`).
No hace falta que la cambies — es la misma que le voy a pegar a la app cuando
me pases la URL del paso 3.

## Paso 2 — Publicar

1. Arriba a la derecha, botón azul **Implementar** → **Nueva implementación**.
2. Al lado de "Seleccionar tipo" tocá el engranaje ⚙️ y elegí **Aplicación web**.
3. Completá así:
   - **Descripción**: `v1`
   - **Ejecutar como**: **Yo** (tu email) ← importante
   - **Quién tiene acceso**: **Cualquier persona** ← importante
4. Tocá **Implementar**.

> ⚠️ "Cualquier persona" suena riesgoso pero no lo es: sin la clave secreta
> (que sólo está en el código y en la app) el servidor rechaza todo pedido.

## Paso 3 — Autorizar

La primera vez Google te va a pedir permiso:

1. **Autorizar acceso** → elegí tu cuenta.
2. Va a aparecer *"Google no verificó esta aplicación"*. Es normal: la
   hiciste vos.
3. Tocá **Configuración avanzada** (abajo a la izquierda).
4. Tocá **Ir a ObraCalc Servidor (no seguro)**.
5. **Permitir**.

Al terminar te muestra una **URL de la aplicación web** parecida a:

```
https://script.google.com/macros/s/AKfycbx...largo.../exec
```

**Copiala y pasámela** — con eso termino de conectar la app.

---

## Cómo queda organizado tu Drive

```
ObraCalc_Datos/
└── Ampliación Vivienda Unifamiliar/     ← una carpeta por obra
      ├── datos.json      ← lo que lee y escribe la app
      ├── info.json       ← ficha corta (propietario, cantidades, fecha)
      ├── columnas.csv    ← listado de columnas, abrible en Excel
      ├── vigas.csv
      ├── bases.csv
      └── losas.csv
```

Se actualiza solo cada vez que usás "Guardar proyecto", "🗄 Guardar" o
"💾 Backup" en la app — no hace falta hacer nada manual en Drive.

---

## Preguntas

**¿Cuesta algo?** No. Apps Script es gratis.

**¿Y si edito el script después?** **Implementar → Administrar
implementaciones → ✏️ editar → Versión: Nueva versión → Implementar.** Si
creás una implementación nueva desde cero te da otra URL distinta y hay que
volver a pasármela.
