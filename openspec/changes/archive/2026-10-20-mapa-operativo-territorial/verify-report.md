# Verificacion documental: mapa operativo territorial

**Resultado:** siete deltas incorporados a sus capacidades canonicas y ledger
reconciliado. El cambio puede archivarse documentalmente; esto no cierra ni
opera `direcciones-y-zonas-operativas`.

Fecha: 2026-10-20. Rama: `feat/cierre-direcciones-y-zonas`.
Base de procedencia: `6cc8324`, que incluye `90164bb` y el payload de `0019`.
Tarea ODD: T2, S1 y S3 de `odd/tasks/cierre-direcciones-y-zonas.md`.

## Alcance y limites

La verificacion es documental y estructural, no un recibo nativo SDD. El
binario `openspec` no esta instalado y la CLI vigente no ofrece esos
comandos: no se inventa una aprobacion ni se instala una dependencia.

El escritor delegado reconcilio el ledger y fusiono seis capacidades.
Dejo la septima por una superficie de edicion incorrecta: el delta llamado
`territorio` se titula «Delta for Jerarquia Territorial» y corresponde a
`openspec/specs/jerarquia-territorial/spec.md`, no a una capacidad nueva
`territorio`. El padre completo esa fusion, sin duplicar la fuente de
verdad, y ajusto la referencia activa desde el SDD de direcciones.

## Fusion de deltas

| Delta | Canonico | Requisitos / escenarios resultantes |
|---|---|---:|
| `actualizacion-en-vivo` | `openspec/specs/actualizacion-en-vivo/spec.md` | 9 / 5 |
| `intervenciones` | `openspec/specs/intervenciones/spec.md` | 11 / 12 |
| `mapa-operativo` | `openspec/specs/mapa-operativo/spec.md` | 9 / 9 |
| `historial-de-calle` | `openspec/specs/historial-de-calle/spec.md` | 7 / 10 |
| `autorizacion-roles` | `openspec/specs/autorizacion-roles/spec.md` | 12 / 36 |
| `reportes-ciudadanos` | `openspec/specs/reportes-ciudadanos/spec.md` | 16 / 27 |
| `territorio` | `openspec/specs/jerarquia-territorial/spec.md` | 20 / 44 |

Los siete deltas son ADDED. Cada bloque de requisito se conserva literal;
ningun requisito canonico anterior se elimina ni se renombra. Los cuatro
canonicos nuevos reciben el cuerpo completo de su delta. El programa de
comprobacion del padre verifica los bloques, los requisitos anteriores y
los recuentos, no solo que existan los archivos.

## Payload ya aprobado de 0019

`90164bb` agrego ocho columnas nullable a `eventos_de_calles`, despues del
ledger original. Archivar solo los deltas habria dejado una especificacion
mas chica que el comportamiento aprobado. Se documenta en dos lugares con
responsabilidades distintas:

- **Persistencia**, «El evento estructural guarda el antes y el despues»,
  en `jerarquia-territorial`: valores de la fila bloqueada, misma
  transaccion, ids historicos sin FK y resolucion de nombres bajo RLS.
- **Presentacion**, «Detalle del cambio de un evento estructural», en
  `historial-de-calle`: antes/despues legible, frase generica sin detalle,
  sin duplicar valores iguales ni inventar eventos anteriores.

| Hecho observado | Fuente en `90164bb` |
|---|---|
| Anterior de la fila bloqueada y escritura atomica | `renombrarCalle.ts`, `reparentearCalle.ts`, `ubicarCalle.ts` y sus tests |
| Nombres de lugares por dos joins bajo RLS, no copias en el evento | `territorio/infrastructure/lectorDeCallesDeMapaSql.ts` |
| Id sin lugar visible conserva el payload con nombre nulo | `territorio/eventosDeCalles.isolation.test.ts` |
| Evento previo a 0019 devuelve `cambio: null` | `territorio/callePorId.integration.test.ts` |
| Antes/despues y fallback sin repetir valores iguales | `historial-de-calle/ui/detalleDeEntrada.ts`, `HistorialDeCalle.cambios.test.tsx` |

No se especifican capacidades futuras, enlaces adicionales ni la operacion
B3d. El delta del cambio de direcciones sigue activo y conserva su propia
precedencia para el corte B2; no se fusiona ni se archiva desde T2.

## Evidencia y procedencia

| Comprobacion | Resultado y alcance |
|---|---|
| Lectura de los siete deltas y sus canonicos | Cuerpos ADDED conservados, sin eliminar requisitos anteriores |
| Recuento estructural del padre | Siete capacidades, con los recuentos de arriba |
| Casillas de `tasks.md` y `apply-progress.md` | Reconciliadas contra la evidencia por unidad, no contra la mera existencia de codigo |
| Referencias activas al cambio | El enlace al diseno desde direcciones apunta al archivo; menciones historicas se conservan |
| `git diff --check` | Sin errores de espacios en la unidad documental |

Las pruebas de runtime no se vuelven actuales por copiarlas a este informe:

- `apply-progress.md`, U8: **338 archivos / 1687 pruebas**, cobertura
  **97.63% sentencias / 92.83% ramas**, check 0 y E2E **13/13**, dos corridas.
  Evidencia historica de U1-U8, anterior a B2.
- `90164bb`: check 0, unitarias **317/1845**, integracion **121/437** y
  migracion 0019 aplicada. Evidencia del payload, no del diff actual B2.
- Las pruebas del arbol actual B2 se registran en su propia unidad ODD.
  No son condicion nueva para archivar documentalmente una capacidad ya
  implementada, ni autorizacion para operar datos reales.

No se ejecutaron operaciones sobre datos reales, push ni PR para T2.
La facturacion de GitHub impide ejecutar CI remoto; este informe no lo
presenta como verde.

## Archivo

Destino: `openspec/changes/archive/2026-10-20-mapa-operativo-territorial/`.
El ledger y las evidencias historicas se conservan junto al diseno y los
deltas. `archive-report.md` distingue este cierre documental del SDD de
direcciones y de la migracion operativa pendiente.
