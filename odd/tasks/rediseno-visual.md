# rediseno-visual

Rama: `feat/rediseno-visual` (desde `main`). Fuente de verdad visual: `DESIGN.md` (commit 91541a6).

## Objetivo

Llevar la UI existente a la identidad de `DESIGN.md`: fuente Inter variable autoalojada, profundidad (fondo + lienzo + sombra de reposo), marca del municipio con presencia en lugares cerrados, shell nuevo, inicio y login rediseñados. Sin romper rendimiento, aislamiento ni accesibilidad AA.

## Alcance autorizado

Solo presentación: `src/app/globals.css`, `src/app/layout.tsx`, `src/app/fonts/`, `src/shared/ui/**`, layouts y pantallas bajo `src/app/(panel)` y `src/app/(acceso)` en lo visual, sus tests. Sin cambios de dominio, aplicación, infraestructura, esquema ni dependencias nuevas.

## Restricciones

- Cero dependencias nuevas; la fuente va como archivo `woff2` en el repo (`next/font/local`).
- Server Components por defecto; `"use client"` solo en hojas que ya lo eran.
- Reglas de AGENTS.md vigentes (≤200 líneas por archivo, ≤3 parámetros, sin acentos en identificadores, comentarios solo con hecho no derivable).
- `pnpm test` y `pnpm check` en verde antes de cerrar cada tarea.

## Tareas

- [x] T1 Tokens y fuente: `globals.css` (paleta nueva, sombras, radios, `--font-sans` Inter), `layout.tsx` con `next/font/local`, componentes base de `shared/ui` (Boton, Campo, Panel, Aviso) y `estilos.ts`/tests. Ruta: delegada (escritor; disparador: 2+ archivos no triviales). Evidencia: RED 10 tests, luego `pnpm test` 387 archivos/1953 tests y `pnpm check` exit 0; verificación del padre: `pnpm test src/shared/ui src/app/titulos.test.ts` 89 pasan, `pnpm check` exit 0. Fuente 47.1 KB. Commit: 6178f4a. Revisión nativa: riesgo medio (`slice_budget_reached`, 1473 líneas desde `main`), consentimiento concedido, aprobada (lente reliability) y acuse quemado; frontera revisada = 6178f4a. Hallazgo informativo R3-001: ningún test cubre que `--fuente-inter` de `layout.tsx` coincida con `--font-sans` de `globals.css` (el mock de `next/font/local` devuelve variable vacía).
- [x] T2 Shell: layout del panel, navegación lateral agrupada con bloque de municipio, barra inferior móvil, `PaginaDePanel`, `Migaja`. Ruta: delegada (escritor, 2 rondas; disparador: 2+ archivos no triviales). Evidencia: RED 12+3 y luego 2 fallos en tests nuevos; `pnpm test` 392 archivos/1977 tests y `pnpm check` exit 0 (escritor); verificación del padre: `pnpm test` de `shared/ui`, `(panel)`, `(acceso)` 203 pasan y `pnpm check` exit 0; capturas desktop/móvil revisadas. Desvíos aceptados: Marca oculta a no administradores (`permite`/`puedeCambiarMarca`), solo el rol (el contexto no trae nombre), migaja dentro de `PaginaDePanel` y no en barra superior (el layout no ve la migaja); hay que reflejarlos en DESIGN.md en T5. Corregido: el activo y el menú Más seguían la ruta inicial; ahora `usePathname` en hojas cliente.
- [ ] T3 Listas: `Tabla` (contenedor tarjeta, fila 48px, chevron), insignias de estado, `ChipDeFiltro`, `EstadoVacio`, `EsqueletoDeFilas`.
- [ ] T4 Inicio y Acceso: saludo + pendientes + módulos agrupados; login en dos mitades.
- [ ] T5 Pasada de pantallas restantes (reportes, territorio, constancias, mapa, marca) y alineación de `docs/06-frontend.md` con DESIGN.md.

## Criterios de aceptación

- Capturas a 1366×768 y 390×844 de login, inicio, padrón, reportes, territorio y constancias sin regresiones visibles.
- Contraste AA, foco por `outline`, estados con ícono y texto.
- Fuente: un solo archivo ≤ ~60 KB, sin petición a terceros.

## Progreso

T1 hecha. DESIGN.md commiteado (91541a6). Pendiente: T1 sale en `titulos.test.ts` con `vi.mock("next/font/local")` (fuera de la superficie original, justificado: el layout ahora llama al cargador de fuentes). Pendiente visual: re-capturar login y padrón tras el último ajuste de `--font-sans`.

## Estrategia de entrega

`ask-on-risk`, resuelta el 2026-10-02: **un solo PR hacia `main` con un commit por tarea** (regla del repo: las ramas no se apilan). La revisión nativa corre por rango acotado, base = última frontera revisada. Pronóstico: ~1200 líneas autoradas, por encima de 400: decidir cadena antes del segundo commit.

## Siguiente paso

Decidir estrategia de cadena (forecast > 400 líneas) y delegar T2 (shell).
