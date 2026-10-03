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
- [x] T2 Shell: layout del panel, navegación lateral agrupada con bloque de municipio, barra inferior móvil, `PaginaDePanel`, `Migaja`. Ruta: delegada (escritor, 2 rondas; disparador: 2+ archivos no triviales). Evidencia: RED 12+3 y luego 2 fallos en tests nuevos; `pnpm test` 392 archivos/1977 tests y `pnpm check` exit 0 (escritor); verificación del padre: `pnpm test` de `shared/ui`, `(panel)`, `(acceso)` 203 pasan y `pnpm check` exit 0; capturas desktop/móvil revisadas. Desvíos aceptados: Marca oculta a no administradores (`permite`/`puedeCambiarMarca`), solo el rol (el contexto no trae nombre), migaja dentro de `PaginaDePanel` y no en barra superior (el layout no ve la migaja); hay que reflejarlos en DESIGN.md en T5. Commit: c9a6cb8. Revisión nativa: riesgo medio, consentimiento concedido, aprobada y acuse quemado; frontera revisada = c9a6cb8. Sugerencias informativas a absorber en T5: (a) `estaActivo` usa `startsWith` sin límite de segmento (`/territorio` marcaría `/territorio2`); (b) barra inferior sin `env(safe-area-inset-bottom)`; (c) "Más" no cierra con Escape ni clic fuera; (d) `modulosDelPanel.ts` importa `puedeCambiarMarca` en runtime desde hojas cliente: verificar con `pnpm build` que no arrastra código de servidor. Corregido: el activo y el menú Más seguían la ruta inicial; ahora `usePathname` en hojas cliente.
- [x] T3 Listas (piezas compartidas): `Tabla` (tarjeta, fila 48px, chevron, encabezado pegajoso), `InsigniaDeEstado`, `ChipDeFiltro`, `EstadoVacio`, `EsqueletoDeFilas`. Ruta: delegada (escritor). Evidencia: RED 11 fallos; `pnpm test` 395 archivos/1996 tests, `pnpm check` exit 0, `pnpm build` limpio (en copia, sin fuga de `roles.ts` al cliente: resuelve la sugerencia (d) de T2); padre: `shared/ui` + padrón 97 pasan, `pnpm check` exit 0. Desvío: `overflow-clip` en vez de `overflow-hidden` para no romper el encabezado pegajoso.
- [x] T3b (hecho; ruta: delegada; `pnpm test` 400 archivos/2010 tests, `pnpm check` exit 0; padre: 213 tests de los módulos y `shared/ui` pasan, check exit 0; padrón sin baja visible en lista, sin cambio; DUPLICADO no existe en el dominio, es RECHAZADO con motivo) [Revisión nativa de T3+T3b: riesgo medio, consentimiento concedido, aprobada, acuse quemado; frontera revisada = e93f19d. Advertencias informativas: tokens y sticky sin cobertura de test más allá de la clase (tokens verificados visualmente en capturas); `estado` sin guarda en `descripcionDeFiltros` descartado porque `leerParametros` tipa `filtros`.] Conectar insignias en `src/modules/{reportes,constancias,padron}/ui` (mapeo estado→tono en la capa ui del módulo) y corregir el mensaje de vacío por filtro que solo nombra `q` (reportes/constancias `page.tsx`).
- [x] T4 Inicio y Acceso: saludo (hora de Mérida vía nuevo `horaEnMerida` en `shared/lib/fecha`), pendientes (solo reportes RECIBIDO, casos de uso existentes; constancias omitido), módulos agrupados con filas completas; login en dos mitades. Ruta: delegada (escritor, 2 rondas). Evidencia: RED en saludo/anchoDelPrimero/horaEnMerida/Inicio/Acceso; `pnpm test` 403 archivos/2043 tests y `pnpm check` exit 0 (escritor); padre: 71 tests de `(acceso)` y `shared/lib` pasan, check exit 0; capturas revisadas.
- [x] T5a Pantallas restantes (formularios y fichas en tarjeta, territorio, mapa, marca, detalles) + arreglos de revisión: `estaActivo` con límite de segmento, zona segura en barra inferior (`viewport-fit=cover`), "Más" cierra con Escape y clic fuera, Inicio no cae si falla el conteo de pendientes. Ruta: delegada (escritor). Evidencia: RED en estaActivo/Inicio/safe-area/cerrarAlInteractuar/migaja de raíces; `pnpm test` 406 archivos/2061 tests y `pnpm check` exit 0 (escritor); padre: 270 tests de `shared/ui`, `(panel)`, `(acceso)` pasan y check exit 0; capturas revisadas. Pendiente conocido: tarjeta "Transiciones" vacía en reporte RESUELTO (requiere lógica, fuera de alcance); "Cancelar" debajo del botón en formularios de territorio.
- [x] T5b (hecho: DESIGN.md y docs/06-frontend.md alineados, sección "Deuda conocida", puntero de sección en `reglas/navegacion.ts` corregido; `pnpm check` exit 0) Alinear `DESIGN.md` con los desvíos aceptados (Marca oculta a no administradores, solo rol, migaja en `PaginaDePanel`, `overflow-clip`, fila de insignia) y `docs/06-frontend.md` (antipatrón 12, sombras, fuente).

## Criterios de aceptación

- Capturas a 1366×768 y 390×844 de login, inicio, padrón, reportes, territorio y constancias sin regresiones visibles.
- Contraste AA, foco por `outline`, estados con ícono y texto.
- Fuente: un solo archivo ≤ ~60 KB, sin petición a terceros.

## Progreso

T1 a T5b hechas. Commits: DESIGN 91541a6, T1 6178f4a, T2 c9a6cb8, T3 34cfec7, T3b e93f19d, T4 d18b2c8, T5a ac8fb85, T5b ver git log. Revisión nativa aprobada y con acuse en T1, T2, T3+T3b, T4 y T5a; T5b (documentación) pendiente de evaluar. Pendiente: T1 sale en `titulos.test.ts` con `vi.mock("next/font/local")` (fuera de la superficie original, justificado: el layout ahora llama al cargador de fuentes). Pendiente visual: re-capturar login y padrón tras el último ajuste de `--font-sans`.

## Estrategia de entrega

`ask-on-risk`, resuelta el 2026-10-02: **un solo PR hacia `main` con un commit por tarea** (regla del repo: las ramas no se apilan). La revisión nativa corre por rango acotado, base = última frontera revisada. Pronóstico: ~1200 líneas autoradas, por encima de 400: decidir cadena antes del segundo commit.

## Siguiente paso

Verificación final, decidir con el usuario push y PR hacia `main` (un solo PR).
