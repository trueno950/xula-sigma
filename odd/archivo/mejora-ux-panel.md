> **Documento de archivo (2026-10-19).** Este diagnóstico es el origen del
> rediseño del panel y del cierre de UX/UI: lo que propone se ejecutó en #91,
> #92, #93, #94 y #95. El estado final vive en `odd/tasks/cierre-ux-ui.md`,
> `territorio-ux.md` y `rediseno-visual.md`. Se rescató de la rama local
> `fix/presentacion-y-404-interno` al retirarla.

# Mejora de UX/UI del panel — flujos fáciles, cero redundancia

## Objetivo
Que los flujos sean fáciles para un operador no experto (PRODUCT.md: "el
operador paga el costo de cada clic de más"), cumpliendo WCAG AA y
docs/06-frontend.md, con el pulido de impeccable/emil: bonito, profesional,
sin redundancia. Foco: las pantallas más difíciles, por prioridad.

## Diagnóstico (prueba funcional 2026-10-01 + DOM)

1. **El menú no se ve activo** (queja directa): en la barra lateral el
   estado activo es `bg-caliza-relleno font-medium` sobre `caliza-lienzo`
   — diferencia casi invisible (0.94 vs 0.99 de L). `aria-current` sí está,
   pero el color no alcanza y la diferencia de peso tampoco se ve.
2. **Territorio complica**:
   - Las pestañas Lugares/Calles/Domicilios son enlaces con conteo, todos
     iguales: no se ve en cuál estás.
   - "Registrar domicilio" vive en la ENTRADA de territorio, pero los
     domicilios viven dentro de cada lugar: el operador sale de su contexto
     para crear lo que está viendo.
   - Los disparadores ("Agregar asentamiento", "Registrar domicilio",
     "Nueva persona") siguen visibles con el formulario ya abierto:
     redundancia.
3. **Redundancia general**: enlaces duplicados de la misma acción en una
   misma pantalla (Nueva persona ×2, etc.).

## Ejecución

- **P1 hecha** — PR #91 fusionado en `main` en `05ad38999b360a8a0763b43a9a16fbe83987bc7a`
  (2026-10-01T23:55:33Z, squash). Nota honesta: el job "Revisión de IA" del
  PR falló porque el paso "Instalar Gentle AI" del runner falló (infra
  transitoria) y la revisión quedó en skip — el revisor nunca corrió; la
  verificación fue local (E2E 4/4 + agent-browser sobre dev).
- **P2 parcial**: las pestañas del panel ya tenían estado activo con borde
  de marca (`Pestanas.tsx`) — el hallazgo era de la barra, no de las
  pestañas. Queda P2b: alta de domicilio dentro del contexto del lugar.
- Disparadores: la entrada de territorio ya oculta el enlace de la acción
  abierta (`AccionesDeRaiz`); el duplicado de "Nueva persona" es el CTA de
  estado vacío, legítimo.

## Hallazgos de IA sobre P2b (run 36954204729 — por corregir)

1. **El formulario no emite `raiz`/`nodo`** (`FormularioDeDomicilio.tsx`):
   `altaDeDomicilioAction` reconstruye el destino con `navegacionDe(formData)`
   y ante error `volverAlArbol` manda a la entrada sin formulario. Los demas
   formularios en-lugar ya llevan `name="raiz"`/`name="nodo"` ocultos; el
   test `formularioDeDomicilio.test.tsx:85-86` fija la AUSENCIA (hoy encierra
   el bug) — actualizarlo a presencia.
2. **Alcance municipio, no "las de ahi"** (`cargaDeTerritorio.ts` +
   `VistaDeLugar.tsx:119`): `listarCallesDelMunicipio` + `zonaDelFormulario(
   lugares, undefined, undefined)` cargan municipio entero; el test unitario
   del formulario ya usa `opcionesDeCalles` y pasa lugar actual a
   `zonaDelFormulario` — cablear produccion igual (calles de la raiz,
   lugar actual en zona).
3. **Sobra `registroAbierto`/`callesDelMunicipio: []` en la rama de raiz**
   (`cargaDeTerritorio.ts:92`) — el objeto inline de raiz todavia los trae.
4. Comentario viejo en `listarCallesDelMunicipio.ts:10-13` (si queda sin
   llamadores, evaluar eliminar la funcion y su test).

Fix: (a) `FormularioDeDomicilio` props `raiz`/`nodo` ocultos opcionales;
(b) `RegistroDeDomicilio` los pasa; (c) `VistaDeLugar` usa `calles` de la
raiz + `zonaDelFormulario(lugares, raiz.id, nodo.id)`; (d) limpiar carga;
(e) tests a las nuevas expectativas. Verificar en dev + PR.

## Hallazgos de IA ronda 2 (run 37024446243 — POR CORREGIR, CI rojo)

1. **REGRESION**: existe la pagina dedicada `/territorio/domicilios` cuyo
   boton "Agregar domicilio" (`RegistroDeDomicilios.tsx:61`) apunta a
   `/territorio?accion=domicilio` — URL que el P2b dejo sin formulario.
   El alta quedo inalcanzable desde esa pantalla y el test
   `domicilios/page.test.tsx:157-161` aun afirma el href. Decidir: el
   boton lleva al lugar (requiere contexto) o la entrada recupera el alta.
2. **Comentarios viejos**: `page.tsx:22-23` ("el formulario de domicilio
   tambien se sirve desde la entrada" — falso ahora) y
   `TabDeDomicilios.tsx:29-30` ("El alta vive en el registro plano" — URL
   muerta). Actualizar ambos.
3. Nota: la revision SI corrio con el tap fijado (STATUS parseado ✔).

Plan ronda 2: leer `domicilios/page.tsx` + `RegistroDeDomicilios.tsx`
completos, decidir el funnel del alta desde el listado municipal,
corregir href/comentarios/tests, verificar en dev + push.

## Prioridades

**P2b hecha** — PR #92 (`fix/domicilio-en-contexto`, `e5e528b`): el alta de
domicilio vive en la pestana Domicilios de cada lugar; la entrada queda con
"solo agregar asentamiento". Verificado en dev con agent-browser (alta de
un segundo domicilio en ciclo completo). Queda CI.

- **P1 Menú activo visible** — marca de posición (barra lateral) en color
  de marca + contraste, y estado activo también en la fila móvil.
- **P2 Territorio** — pestañas con estado activo; alta de domicilio dentro
  del contexto del lugar; disparador se oculta con el formulario abierto.
- **P3 Padrón** — quitar enlace duplicado de "Nueva persona".
- **P4 Reportes/Constancias** — mismo patrón anti-redundancia.

## Reglas del trabajo

- `docs/06-frontend.md` manda: sin animación decorativa, más texto menos
  icono, teclado completo, WCAG AA con contraste 4.5 sobre marca.
- `DESIGN.md` tokens; nada de colores fuera del catálogo.
- Server Components salvo justificación; sin `"use client"` nuevo salvo el
  que ya existe.
- Cada cambio verificado en dev con agent-browser antes del push.
