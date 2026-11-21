# Refinamiento de UX del módulo Usuarios

Séptima parada del recorrido de pulido pantalla por pantalla, después de
Reportes, Padrón, Constancias, Territorio, Mapa e Intervenciones
(`intervenciones-ux.md`).

**Método** (el mismo de los anteriores):
1. Auditoría con capturas a 1440 y 390.
2. El usuario elige qué se arregla.
3. Las pantallas que cambian de estructura pasan antes por gentle design:
   dos direcciones, y el usuario elige con «Implement».

Los tokens salen de `design/system.md`; se reusan los patrones de listado,
acciones y filtros de los tracks anteriores.

**Dónde se trabaja:** rama `feat/usuarios-ux`; capturas en
`/tmp/ux-usuarios/`.

## Specs

Cada spec cita el hallazgo de la auditoría (L2) que el usuario aprobó en L3.

**Listado `/usuarios`**
- **S1 (L1)** — El administrador no ve «Restablecer contraseña» en su propia
  fila, y el servidor rechaza restablecer la contraseña de quien la pide.
- **S2 (L2)** — Las acciones de cada fila van en un acordeón exclusivo
  `<details name>`, con «Dar de baja» al final, como peligro.
- **S3 (L4)** — Cada acción tiene un nombre accesible que dice de quién es.
- **S4 (L5)** — El listado dice cuántas cuentas hay y cuántas están de
  baja, y el orden es explícito.
- **S5 (L6)** — La fila de una cuenta de baja dice desde cuándo.

**Alta `/usuarios/alta`**
- **S6 (A1)** — Si el servidor rechaza el alta, el formulario vuelve con lo
  capturado (borrador en cookie, el mecanismo de `src/shared/ui`), no vacío.
- **S7 (A2)** — Las validaciones salen en español, nunca el mensaje del
  navegador; el mínimo del nombre se explica antes de escribir.
- **S8 (A3)** — El título no se repite: migaja y encabezado no dicen lo
  mismo dos veces.

**Contraseña temporal**
- **S9 (C1)** — Con o sin JavaScript, la contraseña temporal queda en
  pantalla hasta que la operadora indica que ya la anotó o sale de la
  pantalla; no se borra sola al mostrarse.
- **S10 (C2)** — El aviso ofrece «Copiar» la contraseña.
- **S11 (R1)** — El aviso de restablecimiento no anuncia éxito sin mostrar
  la contraseña nueva; si ya no se puede ver, dice que hay que volver a
  restablecer.

**Baja**
- **S12 (B1)** — «Dar de baja» pide confirmación que el servidor exige y
  nombra a la persona; sin la confirmación no cambia nada.
- **S13 (B2)** — La confirmación de restablecer o dar de baja dice de quién.
- **S14 (B3)** — Recargar la página o volver atrás no vuelve a anunciar una
  acción que no ocurrió.

**Permiso**
- **S15 (P1)** — La pantalla sin permiso conserva encabezado y migaja del
  panel, como el resto de los módulos.

Fuera de alcance: L7, L8, A4, A5, C4, R2, R3, P2, P3 (baja) y, en un track
aparte, C3 (caducidad y cambio obligatorio de la clave temporal) y L3
(reactivar una cuenta dada de baja).

## Tasks

- [x] **T0** auditoría con capturas de listado, alta, restablecer contraseña y baja — worker — commit: (sin cambios de código; capturas en `/tmp/ux-usuarios/`)

- [x] **T1** (S1-S5, S9-S15) diseño en gentle design: dos direcciones para el listado y dos para el aviso de la contraseña temporal; el usuario elige — design — commit: (listado en L9, aviso en L10)
- [x] **T2** (S9, S11) la contraseña temporal no se borra al mostrarse — worker + verify, commit propio (riesgo: manejo de credenciales) — commit: 1069223
- [x] **T3** (S1, S12) el servidor rechaza restablecer la propia contraseña y exige confirmar la baja — worker + verify, commit propio (riesgo: guardas de permisos) — commit: 3223553
- [x] **T4** (S6-S8) alta: borrador, español, título — worker — commit: bbadba8
- [x] **T5** (S2-S5, S13-S14) listado según `design/usuarios-listado/02-agrupado-por-rol.html` (L9) — worker — commit: cafa9cf
- [x] **T6** (S10, S15) aviso y permiso según `design/usuarios-clave-temporal/01-aviso-sobre-la-lista.html` (L10) — worker — commit: c5daec4
- [x] **T7** (S1-S15) verificación, PR y merge — verify — commit: c02f2af (ver L14-L15)

## Log

- **L1** — Al cerrar Intervenciones (PR #154), el orquestador ofreció los
  seguimientos o el siguiente módulo (Usuarios, Historial de calle, Marca y
  exportación). El usuario respondió: «si continua con el siguiente». El
  orquestador tomó Usuarios, el siguiente de la lista, con el método de
  siempre.
- **L2** — Auditoría (T0) con capturas en `/tmp/ux-usuarios/`, sembrando
  por la UI del demo 7 cuentas (operador1-3, consulta1-3, sinjs; consulta2
  de baja). 25 hallazgos:
  - **Listado:** L1 «Restablecer contraseña» en la fila del propio
    administrador (alta), L2 «Dar de baja» siempre visible, sin
    confirmación (alta), L3 la baja no se puede deshacer (alta), L4
    botones homónimos sin nombre accesible, L5 sin conteo ni filtros, L6 la
    fila de baja no dice cuándo, L7 rol sin chip y baja en rojo de error,
    L8 sin ficha de cuenta.
  - **Alta:** A1 el rechazo devuelve el formulario vacío (alta), A2
    validación del navegador en inglés (alta), A3 título duplicado, A4 rol
    sin `required`, A5 la nota no dice que la clave no se recupera.
  - **Clave temporal:** C1 con JavaScript la clave se ve ~300 ms y se
    borra sola (alta; `DescartarClaveAlMostrar.tsx:8-10` llama a la Server
    Action al montar y la ruta se redibuja sin la cabecera; confirmado por
    el orquestador en el código), C2 sin «Copiar», C3 la clave temporal no
    caduca ni obliga a cambiarla (alta), C4 el aviso no lleva el correo.
  - **Restablecer:** R1 anuncia éxito aunque la clave ya no se vea, R2 sin
    confirmación, R3 el token queda en la URL.
  - **Baja:** B1 un clic sin confirmación (alta), B2 confirmación genérica,
    B3 recargar `?ok=baja` vuelve a anunciarla.
  - **Permiso:** P1 pantalla sin encabezado ni migaja, P2 no dice el rol
    ni a quién pedir acceso, P3 `/usuarios/alta` igual.
  - Candidatas a gentle design: listado (L1-L8) y aviso de clave + permiso.
  - Quedó la cuenta de prueba `sinjs@demo.example.com`.
- **L3** — El usuario eligió «Alta y media, sin C3 ni L3 (recomendado)»,
  «Track aparte después (recomendado)» y «Sí, listado y aviso
  (recomendado)»: 15 hallazgos (S1-S15); C3 y L3 van en un track aparte;
  listado y aviso de la contraseña pasan por gentle design.
- **L4** — T1: direcciones de diseño en `design/usuarios-listado/`
  (`01-tabla-con-acciones.html`, `02-agrupado-por-rol.html`) y
  `design/usuarios-clave-temporal/` (`01-aviso-sobre-la-lista.html`,
  `02-entrega-de-la-clave.html`).
  - Decisiones a confirmar al elegir: migaja «Administración › Usuarios»
    en las pantallas de Usuarios, y la fila propia sin «Dar de baja».
- **L5** — Verificador independiente sobre T2: S9 y S11 cumplidas; el
  Route Handler nuevo es limpio (sin base, sin oráculo, cookie httpOnly y
  `SameSite=Lax`). Hueco previo a T2 que el arreglo de C1 dejó a la vista:
  con JavaScript, una recarga antes de que termine el descarte vuelve a
  mostrar la contraseña, porque el `Set-Cookie` del render sintético del
  redirect no se guarda. Decisión del orquestador: quitar `?clave=` de la
  URL con `history.replaceState` al pintar la tarjeta (cierra también R3)
  y dejar la explicación en un solo lugar (AGENTS.md).
- **L6** — T2 terminado en `1069223`: descarte por Route Handler, «Ya la
  anoté» nativo, `replaceState` quita el token al pintar. Unit 207, `check`
  limpio, E2E de usuarios y acceso 17/17 (incluida la recarga inmediata).
  T3 en curso.
- **L7** — T3 terminado en `3223553`, verificado sin bloqueos: orden
  objetivo → rol → propia cuenta (sin oráculo entre municipios), la baja
  exige `confirmar=si` antes del caso de uso, los rechazos no escriben
  (comprobado en la base). Se sumó la prueba del orden del verificador
  (`restablecerContrasenia.orden.integration.test.ts`, con sesiones) y la
  explicación quedó solo en AGENTS.md. T4 en curso.
- **L8** — T4 terminado en `bbadba8`: borrador del alta con el
  mecanismo de `src/shared/ui` (sin contraseña, el correo solo en la cookie
  httpOnly); sin `required`, `minLength` ni `type="email"` para que el
  mensaje sea siempre el del servidor en español; migaja «Usuarios › Alta»
  y encabezado «Nuevo usuario». Unit 307, E2E de usuarios 11/11.
- **L9** — El usuario eligió desde el lienzo el diseño del listado:
  «Implement the design artboard
  design/usuarios-listado/02-agrupado-por-rol.html».
  - `01-tabla-con-acciones.html` queda como alternativa.
- **L10** — El usuario eligió desde el lienzo el diseño del aviso:
  «Implement the design artboard
  design/usuarios-clave-temporal/01-aviso-sobre-la-lista.html».
  - `02-entrega-de-la-clave.html` queda como alternativa.
  - T6 toca `src/app/(panel)/usuarios/page.tsx` y `AvisoDeClaveTemporal`,
    los mismos archivos que T5: arranca cuando T5 termine.
- **L11** — T5: un Server Component no puede borrar una cookie, así que un
  aviso de «una sola vez» con borrador en cookie se repetiría al recargar
  sin JavaScript. Decisión del orquestador: el aviso de S13/S14 viaja como
  la contraseña temporal, por el proxy (`avisoATrasladar`: cookie →
  cabecera y borrado en la misma respuesta), con la lógica extraída a un
  módulo hermano porque `src/proxy.ts` ya tiene 200 líneas.
- **L12** — T5 terminado en `cafa9cf`. Con JavaScript el aviso se repetía al
  recargar (mismo hueco que T2); se cerró con una isla que quita `?aviso=`
  con `replaceState` y borra la cookie por `POST /usuarios/aviso`, que
  comparte borde con el descarte de la clave. Unit 459, `check` limpio,
  E2E de usuarios y acceso 25/25. T6 en curso.
- **L13** — T6 terminado en `c5daec4`. Tarjeta de la clave con nombre, correo y
  rol, «Copiar» como isla cliente (solo con JavaScript), el estado «ya no
  se puede mostrar» con «Restablecer la contraseña de …» si los permisos
  lo dejan, y la pantalla sin permiso dentro de `PaginaDePanel` con un
  solo texto. Cookie nueva `destinatario-de-la-clave` (id + token, 120 s,
  httpOnly, sin la clave) para nombrar a la persona sin tocar la URL.
  Unit 376, E2E de usuarios y acceso 28/28.
- **L14** — T7: verificador independiente del track. S1-S5 y S7-S15
  cumplidas; S6 parcial por una prueba de integración del alta que quedó
  vieja con el borrador (`altaDeUsuarioAction.integration.test.ts`),
  corregida en `c02f2af` junto con las sondas del traslado de un solo uso
  (`src/proxyTraslados.probes.test.ts`) y los atributos de la cookie del
  destinatario. Unit 3549, integración de auth y usuarios 104/104, `check`
  limpio. Seguridad: tres cookies httpOnly, SameSite=Lax, `/usuarios`,
  120 s; cabeceras `x-xula-*` entrantes borradas en el proxy; Route
  Handlers sin base ni oráculo.
  - La primera E2E completa dio 17 fallas porque el verificador corría la
    integración sobre `xula_test` al mismo tiempo; se repite sola.
  - Seguimientos: la explicación del render sintético aparece dos veces en
    AGENTS.md; pasados 120 s la confirmación de restablecimiento ya no
    nombra a nadie; `replaceState` y «Copiar» solo tienen cobertura E2E.
- **L15** — E2E completa sola: 200/200. Handoffs del listado y del aviso
  marcados como implementados.
- **L16** — Revisión nativa: la rama entera excede el presupuesto de los
  revisores; se revisa por unidades en `.pi/review-units/`. Unidad 1 (T2+T3,
  `f1623eb..3223553`): aprobada. Aviso no bloqueante: con JavaScript la
  clave queda en la caché del router de Next y «Atrás» tras salir sin «Ya
  la anoté» la vuelve a pintar sin pedir al servidor. Cerrarlo pide que la
  clave no viaje en el payload de la página; se anota para el track de
  seguridad junto con C3.
  - Unidad 2 (T5, `bbadba8..cafa9cf`): la evaluación no pide revisión
    (riesgo medio, no toca `src/shared/auth`).
