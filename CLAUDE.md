# XULA SIGMA

**Sistema Integral de Gestión Municipal y Administración**

SaaS multi-tenant para ayuntamientos pequeños de Yucatán. Digitaliza
trámites y operación interna del palacio municipal.

- Alcance y fases: `ROADMAP.md`
- Índice de estándares: `docs/README.md`
- Estructura, capas y stack: `docs/architecture/estructura.md`
- **Invariantes que no se rompen: `docs/architecture/invariantes-criticos.md`**
- Crear un módulo: `docs/architecture/module-template.md`

Este archivo es el resumen operativo. Cuando el trabajo toca base de datos,
una tabla nueva o una superficie pública, leer los invariantes críticos
antes de escribir código.

**No es un sistema de tesorería.** No se cobra dinero, no se emite CFDI, no
se hace contabilidad gubernamental. Ver sección 2 del roadmap antes de
proponer cualquier funcionalidad que toque esa frontera.

---

## Reglas duras

### Tenancy
Un error aquí es una fuga de datos entre municipios y termina el negocio.

- Toda tabla operativa lleva `ayuntamiento_id` y política RLS con
  `FORCE ROW LEVEL SECURITY`
- Acceso a base de datos **siempre** por `shared/tenancy`. Nunca conexión
  directa. Dos puertas y solo dos: `withTenant` para la operación y
  `withAltaDeAyuntamiento` para el alta de un municipio, cuando el tenant
  todavía no existe. La tercera no entra sin actualizar `AGENTS.md` regla 2
  y el ADR 0001 §2.
- Dentro de transacción: `SET LOCAL app.tenant`. **Nunca `SET` sin
  `LOCAL`** — se queda pegado en el pooler y lo hereda el siguiente
  request de otro municipio.
- Tabla nueva sin test de aislamiento = no entra

### Capas
```
ui ──► application ──► domain ◄── infrastructure
```
- `domain` no importa nada. Ni Next.js, ni Drizzle, ni React.
- `application` define puertos; `infrastructure` los implementa
- Un módulo no importa de otro módulo: va por un puerto de su dominio
- Enforzado por dependency-cruiser. Violarlo rompe el build.

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

### Idioma
- Dominio en español: `constancia`, `padron`, `apoyoTraslado`
- Andamiaje técnico en inglés: `domain`, `useCase`, `repository`
- Identificadores sin acentos ni eñes: `campanias`, `montoMinimo`
- Comentarios, documentación y commits en español

### Comentarios
Un comentario no tiene CI. El día que deja de ser cierto, nada falla —
sigue ahí, afirmando con autoridad algo que ya no pasa. Por eso se escribe
el que carga algo que ningún test puede cargar, y solo ese.

Cinco filtros, en orden. El primero que dispare decide:

1. **¿Reformula el código?** → se borra. `// nulo mientras sigue activo`
   sobre una columna nullable llamada `bajaEn` no informa nada.
2. **¿Describe comportamiento?** → es un test, no un comentario. Un
   `// esto devuelve 404, no 403` sin test al lado es una intención, no
   una garantía.
3. **¿Ya está dicho en otro archivo?** → se deja en UN lugar y el resto
   apunta ahí. Dos copias de una explicación divergen; la que quede vieja
   no avisa.
4. **¿Trae un hecho de afuera del archivo** —línea de un bundle,
   comportamiento de Postgres, regla de negocio— **o documenta una
   ausencia?** → se queda. Es su único hogar. El código no puede explicar
   por qué una columna NO existe.
5. **¿Cita una versión o una línea de un paquete?** → o se vuelve test, o
   lleva la versión escrita al lado. `index.mjs:286` se mueve solo en el
   próximo bump y nadie se entera.

El filtro 4 es el que justifica los comentarios largos de este repo, y no
se recorta por porcentaje: podar por métrica mata primero los largos, que
son justamente los que cargan lo que no está en ningún otro lado.

Ejemplos y detalle: `docs/04-calidad.md` sección 8. GGA lo aplica vía
`AGENTS.md` (antipatrones 17, 23, 24 y 25).

### Datos sensibles
- Motivo de traslado y tipo de asunto del juzgado: **categorías cerradas,
  nunca texto libre**. Un diagnóstico o un pleito familiar en un campo
  abierto es dato sensible sin protección.
- Sin exportación masiva sin bitácora de acceso

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

- **Dos rondas.** La primera corrige, la segunda confirma. Si la segunda
  trae un hallazgo nuevo, se para y lo decide una persona — un hallazgo que
  aparece recién después de un fix puede ser el revisor persiguiéndose la
  cola.
- **"Falta X" se verifica antes de corregir.** `--pr-mode` no ve los
  archivos que llegaron en un commit anterior de una rama apilada y marca su
  ausencia. Se busca X en el repo primero; si está, el hallazgo se descarta.
- **Cuatro hallazgos del mismo tipo son una regla ausente, no cuatro fixes.**
  Se arregla la regla y se corre una sola ronda que la verifique entera.

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
