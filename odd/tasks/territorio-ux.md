# Refinamiento de UX del módulo Territorio

Cuarta parada del recorrido de pulido pantalla por pantalla, después de:
- Reportes, en `odd/tasks/reportes-ux.md`;
- Padrón, en `odd/tasks/padron-ux.md`;
- Constancias, en `odd/tasks/constancias-ux.md`.

**Método:**
1. Auditoría con capturas a 1440 y 390.
2. El usuario elige qué se arregla.
3. Las pantallas que cambian de estructura pasan antes por gentle design:
   dos direcciones, y el usuario elige con «Implement».

Los tokens salen de `design/system.md`. Se reusan estos patrones:
- **Listados:** el de Padrón y el de Constancias, con la línea «N … para
  «q»», chips para quitar filtros, `EstadoVacio` y filas tocables en el
  teléfono.
- **Acciones:** el acordeón exclusivo `<details name>`, con la acción de
  peligro al final, como en `AccionesDeReporte`, `AdministrarPersona` y
  `AccionesDeConstancia`.
- **Filtros:** «Filtros (N)» plegable, como en la bandeja de reportes.

**Dónde se trabaja:**
- Rama `feat/territorio-ux`, en `.pi/wt-t`.
- Base de pruebas `xula_test_t`; el pre-push corre contra `xula_test`.
- Capturas de la auditoría en `/tmp/ux-territorio/`.

## Specs

Cada spec cita el hallazgo de la auditoría que el usuario aprobó en L2,
con «1»: prioridad alta y media, sin ZD2.

### Entrada `/territorio`

- **S1** (I1): «La búsqueda «Colonia o comisaría» no tiene botón «Buscar».
  En el celular nadie sabe que hay que pulsar Enter.» Los dos buscadores
  de la entrada reciben el mismo trato: botón y chip.
- **S2** (I2): «No dice cuántos asentamientos hay ni cuántos quedaron al
  buscar.»

### Asentamiento (pestañas Colonias / Calles / Domicilios / Editar)

- **S3** (A1): «Editar» parece una pestaña más. Renombrar, mover y dar de
  baja deberían ir en un acordeón de acciones en la cabecera, con «Dar de
  baja» al final y en rojo.
- **S4** (A2): «Al buscar una calle, la lista se filtra pero no dice
  cuántas coincidieron. La pestaña sigue diciendo 6.»
- **S5** (A3): «Domicilios 9», pero las colonias suman 6. Tres domicilios
  están directo en la cabecera, sin colonia, y no aparecen en ninguna fila.
- **S6** (A4): «Si no hay colonias, solo aparece una frase y no ofrece
  «Agregar colonia».»

### Calle

- **S7** (C1): «Es un fallo: un enlace a una calle cae en la pestaña
  Colonias y la calle no se abre, sin ningún aviso.»
- **S8** (C2): «De cada calle solo se sabe si está ubicada; no cuántos
  domicilios tiene ni a qué zona pertenece.»

### Registro de domicilios `/territorio/domicilios`

- **S9** (R1): «Hay tres filtros y el primero dice «calle y número», así
  que no queda claro dónde va el número. En el celular son cuatro
  controles antes del primer resultado.»
- **S10** (R2): «No dice cuántos domicilios hay ni cuántos coinciden con la
  búsqueda.»

### Zonas `/territorio/zonas`

- **S11** (ZD1): «Dentro de una zona, las calles y los domicilios no se
  pueden abrir: las filas no llevan a ningún lado.»
- **S12** (Z1): «El formulario «Nueva zona» está siempre abierto y empuja
  la lista hacia abajo.»
- **S13** (Z2): «Dice «agrupadas por asentamiento», pero es una tabla plana
  sin el número de calles por zona. Además, «Volver a Territorio» repite la
  ruta de arriba.»

### Transversal

- **S14:** se preserva lo que ya funciona:
  - los formularios nativos sin JavaScript, que son las acciones de
    `territorio` de la tabla de excepciones de `AGENTS.md`;
  - los permisos;
  - el aislamiento entre municipios: un lugar de otro municipio da 404;
  - los borradores en cookie del mostrador;
  - las reglas de jerarquía.

## Tasks

- [x] **T0** (S3-S6, S8-S10) gentle design. Se dibujan dos direcciones
  para el asentamiento con sus pestañas y dos para el registro de
  domicilios, y el usuario elige — design — commit:
- [x] **T1** (S1, S2, S7, S11-S13) arreglos locales de la entrada, la
  calle y las zonas — worker — commit: 6ba55c6, b93b0e9, 09171d3
- [x] **T2** (S3-S6, S8) asentamiento según `design/territorio-asentamiento/01-cabecera-con-acciones.html` (L4) —
  worker — commit:
- [x] **T3** (S9, S10) registro de domicilios según `design/territorio-domicilios/01-una-busqueda-con-pista.html` (L3) —
  worker — commit:
- [ ] **T4** (S1-S14) verificación, PR y merge — verify — commit:

## Log

- **L1** — Al cerrar Constancias (PR #147), el orquestador recomendó
  Territorio. El usuario pidió primero un ajuste, que entró en el PR #148:
  «no me gusto que quedo de lado el estatus […] corrige y continua con la
  siguiente vista».
- **L2** — Auditoría con capturas de ocho pantallas en
  `/tmp/ux-territorio/`, de 15 hallazgos. El usuario eligió «1»:
  - alta y media, sin ZD2;
  - gentle design para el asentamiento y para el registro de domicilios;
  - lo demás, directo.
- **L3** — El usuario eligió desde el lienzo el diseño del registro de
  domicilios: «Implement the design artboard
  design/territorio-domicilios/01-una-busqueda-con-pista.html».
  - `02-calle-y-numero-separados.html` queda como alternativa.
  - T3 corre en `.pi/wt-t3`, con la base `xula_test_t3` y el puerto 3109,
    en paralelo a T1, y se integra a `feat/territorio-ux`.
- **L4** — El usuario eligió desde el lienzo el diseño del asentamiento:
  «Implement the design artboard
  design/territorio-asentamiento/01-cabecera-con-acciones.html».
  - `02-dos-columnas-con-resumen.html` queda como alternativa.
  - T2 toca los mismos archivos que T1: `page.tsx` y `parametros.ts` de
    `/territorio`. Por eso arranca en `.pi/wt-t` cuando termine T1, encima
    de sus cambios.
- **L5** — T1 y T3 terminados e integrados en `feat/territorio-ux`.
  - **Commits de T1:**
    - `6ba55c6`: la calle abre su panel (S7);
    - `b93b0e9`: el botón y el resumen de la entrada (S1 y S2);
    - `09171d3`: las zonas (S11 a S13).
  - **Commit de T3:** `a6b28cb`, el registro (S9 y S10). Viene de la rama
    del registro.
  - **Verificación de T1:**
    - unit completa 3206;
    - E2E de territorio 53;
    - zonas 12 de integración.
  - **Verificación de T3:**
    - unit completa 3196;
    - integración del registro 15;
    - E2E 23.
  - **Detalle anotado para T2:** en el registro, «Registrar domicilio» quedó
    en un renglón propio, debajo del título, y no al lado como en el
    tablero. Se ajusta junto con T2.
  - Cinco integraciones de esquema fallan contra `xula_test_t` por permiso
    de la base clonada. Es del entorno: el pre-push corre contra
    `xula_test`.
- **L6** — T2 terminado en `d25740e`.
  - **S3:** «Editar» ya no es pestaña. `AccionesDeLugar` es un acordeón
    `<details name>` en la cabecera, con los formularios nativos sin cambio
    y la baja al final. Los enlaces viejos `?vista=editar` y `?accion=`
    siguen funcionando: abren su pliegue.
  - **S4:** «N calles para «q»», con chip.
  - **S5:** la fila «Sin colonia» sale de `domiciliosDirectos`, en la
    misma consulta.
  - **S6:** `EstadoVacio` con «Agregar colonia».
  - **S8:** columnas Zona y Domicilios, de una sola lectura,
    `detallesDeCalles`, con su prueba de aislamiento.
  - **L5:** «Registrar domicilio» va junto al título.
  - **Renombres:** el orquestador renombró `TabDeEdicion.tsx` a
    `AccionesDeLugar.tsx` y `RenglonDeEdicion.tsx` a
    `PliegueDeEdicion.tsx`.
  - **Verificado:**
    - unit completa 3267;
    - integración 22;
    - E2E 32 + 4 + 28.
