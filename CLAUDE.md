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
- Acceso a base de datos **siempre** por el helper de `shared/tenancy`.
  Nunca conexión directa.
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
src/shared/{tenancy,auth,ui,lib}
src/app/          Solo routing y composición
```
Módulo nuevo se crea con sus cuatro capas.

### Testing
TDD estricto. El test se escribe antes que la implementación.

- Dominio y casos de uso: obligatorio
- Aislamiento por tenant: obligatorio, sin excepción
- El objetivo no es el porcentaje: es que cada camino de decisión del
  dominio tenga un test que lo describa
- **Pero hay piso: 80% en `modules/**/domain` y `modules/**/application`.**
  Está en `vitest.config.ts` y CI lo hace fallar. La reja existe porque una
  IA sin restricción salta tests, y un número en CI es más confiable que la
  buena intención. Un test que siempre pasa es peor que ninguno.

Suites: `unit` corre sin base de datos. `integration` —que incluye los
`*.isolation.test.ts`— necesita Postgres: `pnpm db:local` lo levanta.

### Idioma
- Dominio en español: `constancia`, `padron`, `apoyoTraslado`
- Andamiaje técnico en inglés: `domain`, `useCase`, `repository`
- Identificadores sin acentos ni eñes: `campanias`, `montoMinimo`
- Comentarios, documentación y commits en español

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

Antes de decir que algo está listo: `pnpm test` y `pnpm check` en verde.

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
