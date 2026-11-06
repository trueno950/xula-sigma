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
  Pendiente de la decisión de diseño del usuario (ver L1).

## Tasks

- [ ] **T1** · S1,S2 · delegado (respaldo de contexto de la sesión
  principal) — Mudanza y vuelta desde el alta de domicilio. Commit:
- [ ] **T2** · S3 · delegado (mismo motivo) — Residentes en el panel del
  domicilio. Commit:
- [ ] **T3** · S4 · pendiente de decisión.
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
