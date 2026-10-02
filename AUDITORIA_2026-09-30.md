# Auditoría integral de ObraCalc — 30/09/2026

Versión estable previa a la auditoría: etiqueta `auditoria-base-2026-09-30` (commit `8ec9f70`).
Herramientas de prueba: carpeta `auditoria/` (correr con Node + jsdom).

## Método

1. **Oráculo independiente** (`auditoria/oraculo.js`): recalcula toda la obra desde los datos cargados (el
   mismo snapshot que se guarda), con código propio, sin usar ninguna función de la app.
2. **Comparador** (`auditoria/comparar.js`): carga la app, aplica un escenario y compara cada pestaña,
   el Resumen (neto, en unidad base), el hierro (metros, barras sin optimizar, límites del optimizado) y
   que el Resumen use la opción optimizar/no elegida. 5 escenarios, 410 controles.
3. **Casos calculados a mano** (`auditoria/casos_manuales.js`): obra vacía, un elemento por vez,
   resultado esperado escrito fijo; se sigue a pestaña → Resumen → PDF por ítem → % de incremento. 47 controles.
4. **Barrido B (total → origen)**: Resumen = Σ ítems del PDF; cada pestaña = Σ sus ítems.
5. **Casos límite**: cero, vacío, texto, negativos, decimales, muy grandes, separación 0, filas
   agregadas / borradas / duplicadas / reordenadas, filtros de vista.
6. **Funcionamiento**: funciones de los 131 botones/casillas, 621 clics en todos los botones,
   "Ir a la pieza" en 57 casos.

## Errores encontrados y corregidos

| # | Ubicación | Causa | Impacto | Corrección |
|---|---|---|---|---|
| E1 | Estribo tipo 2 (rect. + trabante), columnas y vigas | El trabante (una barra recta) se contaba 2 × alto | Hierro de estribos de más (obra de ejemplo: −6 barras Ø6) | Trabante = 1 × alto + ganchos |
| E2 | Losas macizas (pestaña, parciales, dashboard) | Barras fraccionarias con factor 1,5 (16,5 barras) | La pestaña mostraba 212,55 m y el plan de corte 215,9 m | Cálculo único `macizaBarras()` con barras enteras, usado en los 5 lugares |
| E3 | Cubierta: membrana | Redondeo a rollos enteros en cada sector antes de los %; el Resumen lo recalculaba por su cuenta | "Total cubierta" de parciales (6,6 rollos) ≠ Resumen (4,4 rollos) | Sin redondeo intermedio; un solo cálculo (pestaña → Resumen → dashboard) |
| E4 | Todas las casillas numéricas | Se aceptaban negativos y restaban | Columna con cantidad −5 bajaba el H° y el hierro de la obra; ripio negativo; % −50 partía el pedido | Negativo → 0 al escribir (aviso) y en la lectura |
| E5 | Losas (pretensadas y macizas) | Separación 0 → división por cero | Losetas / barras infinitas | Separación 0 o vacía → 150 mm |
| E6 | Filas cargadas por el asistente / importadas / viejas | Texto en campos numéricos | "NaN" en las pestañas | Saneo de filas antes de calcular |
| E7 | Muro principal | Junta 0 se reemplazaba por 3 cm (en muros agregados sí valía 0) | Ladrillos/m² incorrectos con junta 0 | Vacío → 3 cm; 0 → 0 |
| E8 | Todo redondeo hacia arriba (70 lugares) | Residuo de coma flotante: 25 × 1,12 = 28,000000000000004 | Una unidad de más (pedía 29 barras en vez de 28; 57 en vez de 56…) | `ceilQ()` descarta el residuo |
| — | Losas: etiquetas | "rollos" para la malla | Unidad equivocada en pantalla | "paneles 2,40×6,00" |

Corregidos antes en la misma jornada (auditorías previas): arena/ripio del H° en obra contados dos veces en el
Resumen; hierro atado de capa de compresión fuera de las barras a pedir; tarjetas de Bases sin cimientos;
alambre/clavos de losas macizas; dashboard (oculto) que sumaba cemento del H° elaborado; "A pedir" de Recortes
sin los % por pestaña.

## Conciliación

detalle = subtotales = consolidado = total general — verificado:

- Oráculo vs app: 410 controles, 0 diferencias (escenarios base, todo en obra, todo elaborado, completo, filas).
- Resumen = Σ ítems del PDF: 0 diferencias en todos los materiales (hierro: ±1 barra esperable, porque el
  Resumen aprovecha sobrantes entre ítems y el PDF sólo dentro de cada ítem).
- Pestañas = Σ sus ítems: 0 diferencias.
- Casos a mano: 47 / 47.

## Definiciones resueltas por el usuario (01/10/2026) — aplicadas y verificadas

| # | Definición | Cambio en la app |
|---|---|---|
| D1 | Un solo desperdicio: el % de incremento de cada pestaña | Ladrillos y mortero de mampostería: se quitaron las casillas "Desperdicio / rotura" (5 %) y "Desperdicio de mortero" (13 %). Losetas: sin +5 % propio ni +12 % fijo. Malla de losa: sin +5 % (queda el 10 % de solape entre paneles, igual que en contrapiso). Membrana: sin +10 % ni +5 % (quedan 9 m² útiles por rollo de 10 m², el resto es solape). Ahora todos toman el % de su pestaña (antes la malla no tomaba ninguno). |
| D2 | Techo liviano: H° de vigas × 1,5 | Sin cambios (confirmado). |
| D3 | Contrapiso con el dosaje de Dosificaciones; carpeta 1 : 3 (cemento portland : arena gruesa) | Contrapiso en obra: 100 % del dosaje (antes 60 % del cemento). Carpeta: kg y m³ de la mezcla 1 : 3 por volúmenes absolutos → 459,97 kg de cemento y 0,986 m³ de arena por m³ (antes 250 kg y 1,43 m³). |
| D4 | Losas macizas: ganchos y anclajes según CIRSOC 201 | Ancho/largo = luz libre entre apoyos; cada barra + 15 cm de anclaje en cada apoyo (art. 12.11.1) + gancho normal a 90° de 12 Ø en cada extremo (art. 7.1). Ej.: 3,00 m Ø8 → 3,492 m. |
| D5 | Alambre y clavos sólo en H° armado de columnas, vigas, bases y losas macizas | Sin cambios (confirmado). |

Impacto en la obra de ejemplo (a pedir): cemento portland 772 → 1.000 bolsas (contrapiso al 100 % +144, carpeta 1:3 +60, más el %),
cemento de albañilería 520 → 490, arena gruesa 74,3 → 68,3 m³, ladrillones 10.035 → 9.556, losetas 367 → 348, membrana 14 → 13 rollos,
hierro Ø8 61 → 67 barras (ganchos y anclajes de losas macizas).

Verificación: oráculo actualizado con las mismas reglas → 0 diferencias en los 5 escenarios; casos a mano 64 / 64
(nuevos: ladrillos con un solo %, carpeta 1:3, losetas y malla, losa maciza CIRSOC, membrana); botones, "Ir a la pieza",
% por pestaña y "A pedir" de Recortes sin cambios. La malla de losas + contrapiso del Resumen ahora coincide con la suma de los ítems
(antes 50,88 vs 46,25 m²).

## Constantes técnicas vigentes (sin cambios)

Aire 1,5 % (H°) y 3 % (morteros); densidades; ciclópeo 45 % piedra; solapes de barras +10 %; emulsión 0,9 L/m²;
emulsión, aislación, hidrófugo, alambre y clavos con +5 % fijo (no se suman al % de la pestaña).

## Riesgos

- Código muerto: ~70 referencias a elementos que ya no existen (dashboard viejo, optimizador viejo). Sin efecto en números.
- Algunos cálculos todavía están repetidos (volumen de columnas en la pestaña y en el PDF). Hoy coinciden y lo controla la auditoría.
- Correr `auditoria/comparar.js` y `auditoria/casos_manuales.js` después de cada cambio.

## Estado final por módulo

| Módulo | Estado |
|---|---|
| Datos de obra / niveles | VERIFICADO |
| Dosificaciones (hormigón y morteros) | VERIFICADO |
| Columnas | CORREGIDO Y VERIFICADO (E1, E4, E6, E8) |
| Vigas (VF/VA, VD/VE/VC, zapatas) | CORREGIDO Y VERIFICADO (E1, E8) |
| Bases y cimientos | VERIFICADO |
| Mampostería (muros, armado, antepechos) | CORREGIDO Y VERIFICADO (E7, D1) |
| Revoques y cielorrasos | VERIFICADO |
| Contrapiso / carpeta / sectores | CORREGIDO Y VERIFICADO (D3) |
| Losas pretensadas y macizas | CORREGIDO Y VERIFICADO (E2, E5, D1, D4) |
| Cubierta | CORREGIDO Y VERIFICADO (E3, D1) |
| Recortes / plan de corte | VERIFICADO |
| Unidades comerciales | VERIFICADO |
| Resumen / PDF por ítem / dashboard | CORREGIDO Y VERIFICADO (E8) |
| Reglas de desperdicio (D1–D5) | CORREGIDO Y VERIFICADO |

## Cambios del 02/10/2026 (verificados con el mismo método)

| # | Pedido | Cambio |
|---|---|---|
| P1 | Resumen: columna editable | Nueva columna **A pedir final**: vacía = la cantidad con incremento; lo escrito a mano es lo que sale en el PDF, el texto copiado, el CSV y el Excel. Se guarda con la obra (`resAjustes`). "Neto" y "Con incremento" no cambian. |
| P2 | Carpeta niveladora en Dosificaciones | Nueva fila de mortero: Cemento + arena (tradicional 1 : 3) o Cemento + cal + arena (1 : ¼ : 3). El contrapiso toma esa mezcla; la cal, si la lleva, va al Resumen. |
| P3 | Reestribado en los cruces (columnas y vigas) | **Siempre** (sin opción para apagarlo ni separación única por pestaña — pedido del 02/10). En cada extremo, zona = el mayor de 0,60 m, 2 × la mayor dimensión de la sección y 1/5 de la luz de H°; separación en la zona = la mitad de la separación de **cada fila** (c/15 → c/7,5; c/20 → c/10). En vigas continuas cargadas en una fila, la regla del 1/5 da el mismo largo total densificado (40 %) que tramo por tramo. |

Verificación: oráculo con la misma regla → 0 diferencias en 6 escenarios (nuevo: "variantes", con carpeta con cal y separaciones distintas por fila);
casos a mano 78 / 78 (estribos calculados a mano: columna 20×20 de 3 m c/15 → 29; viga 20×30 de 4 m c/20 → 29; otra fila c/20 → cruces c/10 → 22; carpeta con cal; columna editable → PDF).
Impacto en la obra de ejemplo: estribos de columnas 2.281 → 3.154, de vigas 338 → 487; hierro Ø6 229 → 319 barras.

## Auditoría del % de incremento por pestaña (02/10/2026)

Regla: cada material lleva el % de la pestaña de donde sale; si la pestaña no tiene % propio, el general del Resumen
(mayor o menor, incluido 0 %). Sólo el H° elaborado se pide exacto.

| # | Hallazgo | Corrección |
|---|---|---|
| I1 | Las pestañas mostraban sólo cantidades netas: al cambiar el % no cambiaba nada en pantalla | Tarjeta **"A pedir de esta pestaña"** debajo de la casilla de % (todas las pestañas: neto y a pedir, mismos ítems que el Resumen y el PDF); "Materiales del hormigón" y los paneles "Resumen de hierros" muestran lo que se pide con el % |
| I2 | Alambre, clavos, emulsión, aislación e hidrófugo SIKA con +5 % fijo; hidrófugo de masa sin ningún % | Todos con el % de su pestaña (Resumen y PDF por ítem) |
| I3 | En el Resumen, alambre y clavos no encontraban el % de su pestaña (claves distintas) | Misma clave que los ítems |
| I4 | Losa pretensada con hierro atado: el PDF por ítem y la selección parcial le sumaban igual malla SIMA | Sólo las losas con malla |

Prueba nueva `auditoria/test_pct_tabs.js`: % distinto en cada pestaña (Columnas 15, Vigas 0, Bases 30, Mampostería 20, Revoques 5,
Contrapiso 7, Losas 3, general 12) → cada material del Resumen = Σ (cantidad de cada ítem × % de su pestaña): 0 errores en 3 escenarios.
Casos a mano 108 / 108 (nuevo: columna en obra con 15 %, 5 %, 0 % y vacío = general, en Resumen, tarjeta, materiales del H° y panel de hierros).
