# XULA SIGMA

**Sistema Integral de Gestión Municipal y Administración**

SaaS multi-tenant para ayuntamientos pequeños de Yucatán. Digitaliza
trámites y operación interna del palacio municipal.

- **Las reglas del proyecto: `AGENTS.md`**
- Alcance y fases: `ROADMAP.md`
- Quién usa esto y por qué: `PRODUCT.md`
- Cómo se ve: `DESIGN.md`
- Índice de estándares: `docs/README.md`
- Estructura, capas y stack: `docs/architecture/estructura.md`
- **Invariantes que no se rompen: `docs/architecture/invariantes-criticos.md`**
- Crear un módulo: `docs/architecture/module-template.md`

Este archivo es el resumen operativo. Cuando el trabajo toca base de datos,
una tabla nueva o una superficie pública, leer los invariantes críticos
antes de escribir código. Cuando toca una pantalla o un componente, leer
`DESIGN.md` antes de escribir JSX — es el sistema de diseño real del
proyecto, no una convención tácita, y nada lo carga solo.

**No es un sistema de tesorería.** No se cobra dinero, no se emite CFDI, no
se hace contabilidad gubernamental. Ver sección 2 del roadmap antes de
proponer cualquier funcionalidad que toque esa frontera.

---

## Reglas duras

Las 12 reglas, los 26 antipatrones, las capas, la nomenclatura, los
comentarios y los datos sensibles viven en **@AGENTS.md**. Este archivo no
las repite: una regla escrita en dos lados diverge, y la copia que quede
vieja no avisa. Es el antipatrón 23 aplicado a la raíz del repo.

Lo que sigue es lo que **no** está en `AGENTS.md`: la forma del árbol, los
pisos de cobertura, las herramientas de sesión, el flujo y el stack.

El corte es por audiencia y no por herramienta. `AGENTS.md` es además el
`RULES_FILE` de `.gga`: viaja entero al revisor en cada ronda, así que no
lleva stack ni flujo de trabajo, que no son criterio de revisión. Este
archivo lleva eso y no lleva reglas.

Cada agente llega a los dos por un camino distinto: Claude carga `CLAUDE.md`
y desde ahí importa `AGENTS.md` con `@`; el agente de gentle-shell carga
`AGENTS.md` y este archivo por su cuenta. OpenCode dejó de usarse el
2026-10-18: `opencode.json` ya no se versiona y vive, ignorado, en cada
máquina.

### Estructura
```
src/modules/<modulo>/{domain,application,infrastructure,ui}
src/shared/{tenancy,auth,ui,lib,marca}
src/app/          Solo routing y composición
```
Módulo nuevo se crea con sus cuatro capas.

### Testing
TDD estricto. El test se escribe antes que la implementación.

- Dominio y casos de uso: obligatorio
- Aislamiento por tenant: obligatorio, sin excepción
- El objetivo no es el porcentaje: es que cada camino de decisión del
  dominio tenga un test que lo describa
- **Pero hay piso: 80% en `shared/**` y en `modules/**/{domain,application}`,
  75% en ramas.** Está en `vitest.config.ts` y CI lo hace fallar. La reja
  existe porque una IA sin restricción salta tests, y un número en CI es más
  confiable que la buena intención. Un test que siempre pasa es peor que
  ninguno.
- **Y la reja misma se provoca.** La primera versión medía solo
  `modules/**`, que estaba vacío: daba `0/0` y salía en verde, con
  `@vitest/coverage-v8` ni siquiera instalado. Un piso sobre cero archivos es
  el mismo defecto que denuncia el punto anterior, una capa más arriba.
- Fuera del piso quedan las declaraciones —`esquema.ts`, `configuracion.ts`,
  `politicasPlataforma.ts`, fixtures—: no tienen caminos de decisión y su
  prueba es el test de aislamiento contra Postgres, no una línea ejecutada.

Suites: `unit` corre sin base de datos. `integration` —que incluye los
`*.isolation.test.ts`— necesita Postgres: `pnpm db:local` lo levanta. **La
cobertura se mide sobre las dos**, en el job que tiene base: midiendo solo
`unit`, `withTenant` daba 0% con sus tests de aislamiento en verde, y subir
el número habría pedido tests unitarios que no prueban RLS.

---

### Herramientas de sesión
`rtk` comprime salida de comandos para ahorrar contexto. Se usa para el
ruido: `rtk tsc`, `rtk pnpm`, `rtk git`, `rtk ls`, `rtk diff`.

**Nunca para verificar aislamiento entre municipios.** `pnpm test` y `psql`
van con el comando nativo, sin `rtk`. `rtk test` muestra solo las fallas y
no permite distinguir un test de aislamiento que pasó de uno que no corrió;
`rtk psql` comprime tablas y puede ocultar la fila del otro municipio, que
es exactamente lo que se está buscando. Ver ADR 0001 §8.

---

## Flujo de trabajo

1. Una tarea, un módulo, un commit
2. Test primero
3. El diff se lee completo antes de aceptar
4. Conventional commits en español, sin atribución de IA
5. PR hacia `main` aunque sea de una sola persona
6. Sin dependencias nuevas sin justificación explícita
7. Un PR, un merge. Las ramas no se apilan.

Antes de decir que algo está listo: `pnpm test` y `pnpm check` en verde.

### El ciclo de revisión tiene techo

GGA revisa, se corrige, GGA vuelve a revisar. Ese ciclo no tiene freno
propio: cada vuelta re-manda el diff completo y trae el veredicto entero de
vuelta. En `auth-rbac` fue el gasto más grande del cambio, y casi todo en
vueltas que no encontraron nada nuevo.

**Ya no corre en CI.** Desde el 2026-10-18 el job `revision` se retiró: la
revisión de IA se hace desde gentle-shell, en la máquina de quien escribe.
Antes corría en CI y nada más —también había corrido en `pre-commit` y en
`pre-push`, y el de `pre-push` ejecutaba el mismo comando que CI, así que no
evitaba la vuelta: la pagaba dos veces con un modelo que no coincide consigo
mismo—. GGA queda como herramienta local a demanda. Ver ADR 0001 §7.

| Comando | Qué es | Cuándo |
|---|---|---|
| `pnpm reglas` | Determinista, un segundo, nueve antipatrones y dos métricas de AGENTS.md | `pre-commit`, `check` y CI |
| `pnpm revision:local` | El revisor con la suscripción de OpenAI, sobre lo que está en *stage* y con caché | Mientras se trabaja |
| `pnpm revision` | El revisor de IA por GGA, local | A demanda, cuando el cambio es grande |

Lo que un patrón decide, no paga un modelo.

**Y el proveedor no es el mismo en los dos lados** — el porqué está en `.gga`.
El trabajo diario va con `pnpm revision:local`, que además usa caché —
`--pr-mode` la desactiva siempre.

Y el ciclo, cuando el revisor sí corre:

- **Dos rondas.** La primera corrige, la segunda confirma. Si la segunda
  trae un hallazgo nuevo, se para y lo decide una persona — un hallazgo que
  aparece recién después de un fix puede ser el revisor persiguiéndose la
  cola.
- **"Falta X" se verifica antes de corregir.** `--pr-mode` no ve los
  archivos que llegaron en un commit anterior de una rama apilada y marca su
  ausencia. Se busca X en el repo primero; si está, el hallazgo se descarta.
- **Cuatro hallazgos del mismo tipo son una regla ausente, no cuatro fixes.**
  Se arregla la regla y se corre una sola ronda que la verifique entera. Y si
  un patrón la decide, la regla va a `scripts/reglas/`, no al revisor.

Detalle y el caso que lo originó: `docs/04-calidad.md` sección 9.

---

## Stack

Next.js App Router · TypeScript strict · PostgreSQL · Drizzle · Zod ·
Tailwind · shadcn/ui · Phosphor Icons · React Hook Form · TanStack Table ·
Zustand · `@react-pdf/renderer` · Vitest · Playwright · Biome ·
dependency-cruiser

**Frontend:** Server Components por defecto; `"use client"` se justifica y
va en la hoja. Sin capa de estado de servidor en el cliente — los datos
llegan de RSC y las mutaciones van por Server Actions. Detalle en
`docs/06-frontend.md`.

**Next.js 16, no 15.** El material de entrenamiento y casi todo tutorial
describe 15. Diferencias que importan:
- `middleware.ts` se llama `proxy.ts` y exporta `proxy()`
- `cookies()`, `headers()`, `params` y `searchParams` **solo** con `await`
- React Compiler estable: sin `useMemo` ni `useCallback` manuales
- `"use cache"` reemplaza `unstable_cache` y `revalidate` de segmento

Hosting: Railway. Assets: Cloudflare R2 — el filesystem del contenedor es
efímero, los escudos municipales no van ahí.

---

## Antes de proponer código

- ¿Hay un test que describa el comportamiento? Si no, escribilo primero.
- ¿Toca la base de datos? Va por el helper de tenancy.
- ¿Es tabla nueva? Necesita RLS y su test de aislamiento.
- ¿Es dominio? No importa nada de fuera.
- ¿Se entiende sin explicación? Si no, se reescribe.
