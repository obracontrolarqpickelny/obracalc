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

## Definiciones pendientes (reglas que funcionan como están programadas pero conviene confirmar)

1. **Doble desperdicio** en: ladrillos (desperdicio de Mampostería + % de incremento), losetas (+5 % y +12 % fijo),
   malla de losa (+5 % y +10 %), membrana (9 m² útiles por rollo de 10, +10 % y +5 %), mortero de mampostería
   (desperdicio de mortero + %).
2. Vigas con **techo liviano**: H° en obra × 1,5.
3. **Contrapiso en obra**: 60 % del cemento del dosaje; carpeta 8,75 kg cemento y 0,05 m³ arena por m² de 3,5 cm.
4. **Losas macizas**: barras del largo total, sin descontar recubrimiento ni sumar ganchos.
5. Alambre y clavos sólo sobre H° armado de columnas, vigas, bases y losas macizas (no capa de compresión ni contrapiso armado).
6. Constantes técnicas: aire 1,5 % (H°) y 3 % (morteros); densidades; ciclópeo 45 % piedra; solapes +10 %.

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
| Mampostería (muros, armado, antepechos) | CORREGIDO Y VERIFICADO (E7) |
| Revoques y cielorrasos | VERIFICADO |
| Contrapiso / carpeta / sectores | VERIFICADO |
| Losas pretensadas y macizas | CORREGIDO Y VERIFICADO (E2, E5) |
| Cubierta | CORREGIDO Y VERIFICADO (E3) |
| Recortes / plan de corte | VERIFICADO |
| Unidades comerciales | VERIFICADO |
| Resumen / PDF por ítem / dashboard | CORREGIDO Y VERIFICADO (E8) |
| Reglas de desperdicio y constantes listadas arriba | PENDIENTE DE DEFINICIÓN |
