# Territorio: trabajo de mostrador

Quitar la fricción de los trámites de mostrador que encontró la auditoría de
territorio del 2026-11-05. Rama `feat/territorio-mostrador`, un PR.
Runner: Vitest (`pnpm test`, integración sobre `xula_test`), Playwright para
flujos de navegador, y `pnpm check`.

## Specs

- **S1.** Hallazgo A1 de la auditoría de experiencia: «Una mudanza enviada sin
  elegir domicilio saca al operador de la ficha». Con un `personaId` válido,
  un error de la mudanza vuelve a `/padron/[id]`, no a `/padron`; y el
  formulario no deja enviar sin domicilio elegido, con y sin JavaScript.

- **S2.** Hallazgo A2: «Domicilio nuevo y mudanza no están conectados». Desde
  la mudanza hay un enlace para registrar un domicilio nuevo que, al
  guardarlo, vuelve a la ficha de la persona; y cuando el historial está
  vacío el formulario se titula para registrar el domicilio actual, no una
  mudanza.

- **S3.** Hallazgo A3: «No se puede ver quién vive en un domicilio, y la baja
  se rechaza por eso». El panel del domicilio lista a sus residentes
  vigentes con enlace a su ficha, y el rechazo de la baja dice qué hacer.

- **S4.** Hallazgo A4: «Un error al guardar borra todo lo capturado».
  Decisión del usuario (L2): «Cookie temporal (Recomendado)» — «Ante un
  error, el servidor guarda lo capturado en una cookie httpOnly de un solo
  uso, de vida corta, y la página la usa para rellenar el formulario.
  Funciona igual sin JavaScript y conserva los formularios nativos y su
  excepción en AGENTS.md. El error sigue saliendo arriba, no junto al
  campo.» Empieza por el alta y la corrección de domicilio.

## Tasks

- [x] **T1** · S1,S2 · delegado (respaldo de contexto de la sesión
  principal) — Mudanza y vuelta desde el alta de domicilio. Commit: `8ccb939`. `b2de9d6`.
- [x] **T2** · S3 · delegado (mismo motivo) — Residentes en el panel del
  domicilio. Commit:
- [x] **T3** · S4 · delegado — Cookie temporal con lo capturado en el alta y
  la corrección de domicilio. Commit:
- [ ] **T4** · S1-S4 · `pnpm check`, suite completa, E2E de los flujos, PR
  con issue aprobado.

## Log

- **L1** — 2026-11-06. Pedido textual: «si», respuesta a «Cuando se haga el
  merge del #114, ¿sigo con el bloque de mostrador?», con el bloque descrito
  como «Mostrador: que la mudanza no saque a la operadora de la ficha, ir y
  volver para registrar un domicilio, ver quién vive en cada domicilio y no
  perder lo capturado cuando hay un error.» S4 requiere decidir cómo
  conservar lo capturado: los errores hoy vuelven por `redirect` con
  `?error=`, y llevar los valores en la URL pondría domicilios en los logs
  del servidor, que `AGENTS.md` prohíbe. T1 y T2 van en serie porque
  comparten la base de pruebas.

- **L2** — 2026-11-06. Decisión del usuario sobre S4: «Cookie temporal
  (Recomendado)», sobre las opciones cookie temporal, `useActionState` o
  dejarlo para después.

- **L3** — 2026-11-06. T1 del escritor: S1 y S2 cubiertos. `registrarMudanzaAction` vuelve a `/padron/<id>?error=` cuando el `personaId` es un uuid válido. `SelectorDeDireccion` gana la prop opcional `requerido` (por defecto falso; reportes no cambia): con ella el buscador usa `required` y `setCustomValidity` hasta que se elige una dirección. `regresoAFicha.ts` valida el retorno como `/padron/<uuid>` exacto (rechaza URLs absolutas, `//`, `..`, query y otras rutas); el alta de domicilio lo lleva como campo oculto y, si es válido, redirige a la ficha con `?ok=domicilio-creado`. `RegistroDeMudanza.tsx` titula «Registrar domicilio actual» con historial vacío y ofrece «Registrar un domicilio nuevo». RED/GREEN observados por regla; E2E (a) RED sin `requerido`, (b) ida y vuelta completa en verde. Módulo, shared/ui y rutas 189 archivos y 983 tests; suite completa 477 archivos y 2455 tests; E2E de mudanza y reportes 7/7. Comprobación del padre: `pnpm check` exit 0. Risk: item 2 (destino de redirección tomado del cliente, con esquema estricto y tests), item 3 menor (prop opcional nueva en el selector compartido).

- **L4** — 2026-11-06. Revisión nativa de T1 (`4c65dee..b2de9d6`, riesgo alto por item 2): `review-ce6d33fdb3cda2e5` aprobada y reconocida; advertencia informativa: falta un test del `required` sin JavaScript.

- **L5** — 2026-11-06. T2 del escritor: S3 cubierto. Nuevo caso de uso `residentesDeDomicilio` (residencias abiertas bajo `withTenant` y nombres por el puerto hermano `LecturaDeResidentes`, adaptador sobre `personaPorId` de padrón, agrupados por identidad terminal y ordenados por nombre); sección «Residentes» con enlaces a la ficha y estado vacío en el panel; la baja avisa «Antes de dar de baja esta dirección, registre la mudanza de: …» y `DomicilioConResidentesError` dice qué hacer. Sin guarda de rol, igual que la lectura de la ficha. El formulario de baja manda el `domicilio` oculto para que un rechazo vuelva al panel abierto. RED/GREEN por regla; el test de integración se escribió después del GREEN y se probó que puede fallar quitando la agrupación. Módulo y rutas 169 archivos y 876 tests; reglas sin hallazgos; suite completa 482 archivos y 2473 tests. Pendiente aparte: la unión del nombre completo ya está en tres adaptadores (reportes, constancias, territorio); conviene un ayudante en padrón. Comprobación del padre: `pnpm check` exit 0. Risk: item 3 menor (mensaje de `DomicilioConResidentesError` y prop opcional en `PropsDeContenido`).

- **L6** — 2026-11-06. T3 del escritor (retomado tras un corte por límite de uso): S4 cubierto en el alta y la corrección de domicilio. Cookie `borrador-de-domicilio` httpOnly, SameSite=Lax, `secure` fuera de desarrollo, path `/territorio`, 120 s, con un token aleatorio, el formulario de origen y solo los campos de la operadora (validados con Zod al leer; nada del tenant). En Next 16 un Server Component no puede borrar cookies, así que el uso único se ata al redirect: la URL lleva solo `?borrador=<token>` y la página aplica el borrador solo si coincide; el siguiente envío lo reemplaza o lo borra. Un borrador de alta solo rellena el alta y uno de corrección solo la corrección de ese domicilio. RED/GREEN por regla; módulo y rutas 178 archivos y 939 tests; reglas sin hallazgos; suite completa 487 archivos y 2497 tests; E2E de borrador y mudanza 7/7. Hallazgo previo, fuera de T3: `/territorio` no funciona sin JavaScript, porque su contenido va en `<Suspense>` y el HTML transmitido queda oculto sin script (`/territorio/zonas` sí funciona). El E2E sin JavaScript se limitó a comprobar que el servidor arma el formulario rellenado. Comprobación del padre: `pnpm check` exit 0. Risk: item 2 (cookie con datos del cliente leída por el servidor), item 3 menor.

