# 02 — Nomenclatura

**Obligatorio.** Toda infracción se justifica explícitamente en el PR.

---

## Idioma

La regla que más inconsistencia genera si no se define. Va primero.

| Qué | Idioma | Ejemplo |
|---|---|---|
| Conceptos del dominio | Español | `constancia`, `padron`, `apoyoTraslado`, `ayuntamiento` |
| Andamiaje técnico | Inglés | `domain`, `application`, `repository`, `useCase`, `handler` |
| Comentarios y docs | Español | |
| Mensajes de commit | Español | |
| Textos de UI | Español | |

**Sin acentos ni eñes en identificadores.** Rompen herramientas, obligan a
comillas en SQL y generan variantes duplicadas.

```ts
// ✅ CORRECTO
const campanias = [];
const montoMinimo = 0;
type ApoyoTraslado = { ... };

// ❌ INCORRECTO
const campañas = [];
const montoMínimo = 0;
```

**Por qué el dominio en español.** El lenguaje del negocio es español.
Traducir `constancia` a `certificate` mete una capa de traducción mental en
cada conversación con el tesorero, y en cada bug que se reporta por
teléfono. El código tiene que sonar igual que la conversación.

---

## Estándar global

| Elemento | Formato | Ejemplo | Nota |
|---|---|---|---|
| Componentes React | PascalCase | `EmitirConstancia.tsx` | |
| Rutas de App Router | kebab-case | `app/constancias/emitir/page.tsx` | Convención de Next |
| Hooks | camelCase con prefijo `use` | `usePadronBusqueda.ts` | Siempre `use` |
| Casos de uso | verbo en infinitivo | `emitirConstancia.ts` | Un archivo, un caso de uso |
| Entidades de dominio | PascalCase | `Constancia`, `Folio` | |
| Puertos | PascalCase + `Port` | `ConstanciaPort` | |
| Repositorios | PascalCase + `Repository` | `ConstanciaRepository` | |
| Funciones | camelCase | `buscarPorFolio()` | |
| Constantes | UPPER_SNAKE_CASE | `MAX_REIMPRESIONES` | |
| Types e interfaces | PascalCase | `ApoyoTraslado` | **Nunca** `IApoyoTraslado` |
| Booleanos | `is`/`has`/`should`/`can` + algo | `isVigente`, `hasFolio` | |
| Stores Zustand | `use` + Nombre + `Store` | `useTenantStore` | |
| Tablas Drizzle | camelCase + `Table` | `constanciasTable` | |
| Carpetas | kebab-case | `apoyos-traslado/` | |
| Tests | `*.test.ts` | `folio.test.ts` | Junto al archivo |

---

## Reglas de TypeScript

### Interfaces sin prefijo `I`

```ts
// ✅ CORRECTO
interface ConstanciaPort { ... }
type ApoyoTraslado = { ... };

// ❌ INCORRECTO
interface IConstanciaPort { ... }
```

### Booleanos con prefijo

```ts
// ✅ CORRECTO
const isVigente = true;
const hasReimpresiones = false;
const canEmitir = true;
const shouldNotificar = false;

// ❌ INCORRECTO
const vigente = true;
const reimpresiones = false;
```

### Identificadores tipados

Los IDs no son `string` sueltos. Un `PersonaId` no debe poder pasarse donde
se espera un `ConstanciaId`.

```ts
// ✅ CORRECTO
type PersonaId = string & { readonly __brand: "PersonaId" };
type ConstanciaId = string & { readonly __brand: "ConstanciaId" };

// ❌ INCORRECTO
function emitir(personaId: string, constanciaId: string) { ... }
// nada impide invertir los argumentos
```

Esto importa especialmente con `ayuntamientoId`, que aparece en todas
partes.

### Uniones sobre enums

```ts
// ✅ CORRECTO
type EstadoReporte = "registrado" | "en_proceso" | "resuelto" | "cancelado";

// ❌ INCORRECTO — enum de TypeScript
enum EstadoReporte { REGISTRADO, EN_PROCESO }
```

Las uniones son más simples, serializan directo y funcionan mejor con Zod.

---

## Categorías cerradas

Los campos que podrían recibir datos sensibles son uniones tipadas, nunca
`string`.

```ts
// ✅ CORRECTO
type MotivoTraslado = "salud" | "educacion" | "tramite" | "defuncion" | "otro";

// ❌ INCORRECTO
type MotivoTraslado = string; // acá alguien escribe un diagnóstico
```

Ver `architecture/invariantes-criticos.md`, sección 3.

---

## Orden de imports

```ts
// 1. Externos
import { z } from "zod";
import { eq } from "drizzle-orm";

// 2. Compartido
import { withTenant } from "@/shared/tenancy";

// 3. Del propio módulo
import { Constancia } from "../domain";

// 4. Tipos
import type { ConstanciaPort } from "../domain/ports";
```

Lo ordena Biome automáticamente. No es algo que se recuerde.

---

## Mensajes de commit

Conventional commits, en español, sin atribución de IA.

```text
feat(constancias): emitir constancia de vecindad con folio y QR
fix(tenancy): usar SET LOCAL para no filtrar tenant en el pooler
test(padron): agregar test de aislamiento para tabla personas
docs(arquitectura): documentar invariante de folio consecutivo
chore(ci): validar links del indice de docs
```

Tipos: `feat`, `fix`, `test`, `docs`, `refactor`, `chore`, `perf`.

El scope es el módulo: `constancias`, `padron`, `apoyos`, `tenancy`,
`campanias`, `juzgado`, `portal`.
