# Reglas de revisión — XULA SIGMA

Archivo de reglas para revisión automatizada de código. Condensado a
propósito. La versión completa vive en `docs/`.

**Contexto:** SaaS multi-tenant para ayuntamientos de Yucatán. Varios
municipios en una sola base de datos, aislados por `ayuntamiento_id` y RLS.
El código lo escribe una IA. Esta revisión es el control que reemplaza a la
lectura humana del diff.

**El modo de falla grave no es un bug visible: es que los datos de un
municipio se vean desde otro y nadie se entere.** Ante la duda en algo que
toca datos, marcá el hallazgo.

---

## Las 12 reglas que nadie rompe

1. `any` está prohibido. Se usa `unknown` + type guard.
2. Todo acceso a base de datos pasa por `withTenant`. Sin excepción.
3. `SET LOCAL` dentro de transacción. Nunca `SET` suelto.
4. `ayuntamiento_id` sale del contexto del servidor, nunca del cliente.
5. Tabla nueva = RLS + test de aislamiento, en el mismo commit.
6. `domain` no importa nada. Ni Drizzle, ni Next, ni React.
7. Folio consecutivo por ayuntamiento, con lock en transacción.
8. Recurso de otro tenant devuelve 404, nunca 403.
9. Dato sensible = categoría cerrada. Jamás texto libre.
10. Assets a object storage. El filesystem del contenedor es efímero.
11. El test se escribe antes que el código.
12. El diff se lee completo antes de aceptar.

---

## Antipatrones que bloquean

| # | Antipatrón | Alternativa |
|---|---|---|
| 1 | `any` | `unknown` + type guard |
| 2 | Conexión a base de datos sin `withTenant` | Siempre por `shared/tenancy` |
| 3 | `SET` en vez de `SET LOCAL` | `SET LOCAL` dentro de transacción |
| 4 | `ayuntamiento_id` recibido del cliente | Del contexto de sesión del servidor |
| 5 | Tabla nueva sin RLS | Política RLS + test de aislamiento |
| 6 | `domain/` importando Drizzle, Next o React | Puertos e inversión de dependencias |
| 7 | SQL en el caso de uso | Repositorio |
| 8 | Importar `modules/x/domain` desde otro módulo | Puerto propio + adaptador |
| 9 | Secuencia de base de datos para folios | Contador por tenant con lock |
| 10 | 403 al pedir recurso de otro tenant | 404 |
| 11 | Texto libre donde puede ir dato sensible | Categoría cerrada tipada |
| 12 | Asset subido al filesystem del contenedor | Object storage |
| 13 | Colores de marca aplicados en cliente | Inyección en servidor |
| 14 | `try/catch` que traga el error | Manejo específico o re-throw |
| 15 | Más de 3 niveles de anidación | Early returns |
| 16 | Nombres vagos: `data`, `temp`, `info` | Nombre del concepto |
| 17 | Comentario que explica código obvio | Código autoexplicativo |
| 18 | `"use client"` por defecto | Server Component salvo justificación |
| 19 | Entrada sin validar con Zod | Esquema Zod en el borde |
| 20 | Acentos o eñes en identificadores | Sin diacríticos |
| 21 | Módulo creado con capas incompletas | Las cuatro capas desde el inicio |
| 22 | Dependencia nueva sin justificar | Justificar en el PR |

---

## Revisión de migraciones SQL

Toda migración que crea una tabla hace **cuatro** cosas. Falta una, es
hallazgo:

1. Columna `ayuntamiento_id`
2. `ENABLE` + `FORCE ROW LEVEL SECURITY`
3. Política de tenant
4. `GRANT` al rol de aplicación

Falta el `GRANT` y falla ruidosamente en el primer request. **Falta el RLS
y no falla nunca** — hasta que hay un segundo municipio en producción.

Marcá también: `BYPASSRLS` en cualquier rol, y el rol de aplicación como
owner de una tabla.

---

## Revisión de tests

Los tests entran a la revisión a propósito.

- ¿El test **falla** si se rompe la implementación? Un test que pasa
  siempre no es un test. Es el modo de falla número uno del código
  generado por IA.
- ¿Testea comportamiento o implementación? Un spy sobre `padStart` no
  aporta nada y se rompe al refactorizar.
- ¿Mockea el puerto, o mockea el sujeto del test?
- Tabla con `ayuntamiento_id` sin su `*.isolation.test.ts` = hallazgo.
- Nombres que describen la regla, no `it("funciona")`.

---

## Capas

```
ui ──► application ──► domain ◄── infrastructure
```

| Capa | Importa de | Nunca importa de |
|---|---|---|
| `domain` | nada | application, infrastructure, ui, shared |
| `application` | domain, shared | infrastructure, ui |
| `infrastructure` | domain, application, shared | ui |
| `ui` | application, domain, shared | infrastructure |

Un módulo no importa de otro módulo: va por un puerto de su propio dominio.

---

## Server Actions

- Nunca reciben `ayuntamientoId` por parámetro. Sale de
  `getTenantContext()`. Es una superficie pública: recibe lo que el cliente
  quiera mandarle.
- Validan con Zod `safeParse` en la primera línea.
- No propagan excepciones al cliente. Devuelven `ActionResult<T>`.
- El mensaje de error está redactado para un operador municipal, en
  español. Nunca el texto de la excepción.

---

## Datos personales

Categorías cerradas, nunca `string`, en: motivo de apoyo de traslado, tipo
de asunto del juzgado, tipo de apoyo social.

Un diagnóstico o un pleito familiar en un campo abierto es dato sensible
sin protección, sin importar cómo se llame el módulo.

**En logs no va nunca:** nombre, CURP, domicilio, motivo de traslado, tipo
de asunto del juzgado, programa de apoyo. Un log no tiene RLS ni bitácora
de acceso. Se referencia por ID.

---

## Fecha y hora

- Columnas de momento: `timestamptz`, en UTC.
- Fecha civil (la del calendario, la que ve una persona) siempre por
  `shared/lib/fecha`, que resuelve en `America/Merida`.
- **Nadie llama `getFullYear()`, `getMonth()` ni `getDate()`
  directamente.** El servidor corre en UTC: una constancia emitida el 31 de
  diciembre a las 19:00 hora local caería con el año siguiente en el folio.

---

## Métricas

| Métrica | Límite |
|---|---|
| Líneas por función | ≤ 30 |
| Líneas por archivo | ≤ 200 |
| Profundidad de anidación | ≤ 3 |
| Parámetros por función | ≤ 3 (más, va objeto) |

---

## Nomenclatura

- Dominio en español (`constancia`, `padron`, `apoyoTraslado`), andamiaje
  técnico en inglés (`domain`, `repository`, `useCase`).
- Sin acentos ni eñes en identificadores: `campanias`, `montoMinimo`.
- Interfaces sin prefijo `I`.
- Booleanos con `is`/`has`/`should`/`can`.
- IDs tipados con marca, no `string` suelto.
- Uniones de strings, no `enum` de TypeScript.

---

## Qué NO es hallazgo

No marques:

- Preferencias de estilo que Biome ya formatea
- Falta de abstracción especulativa. La duplicación es más barata que la
  abstracción equivocada: se duplica la primera vez, se aguanta la segunda,
  se abstrae la tercera.
- Ausencia de manejo de casos que el roadmap declara fuera de alcance
  (cobros, CFDI, contabilidad, nómina, cálculo de plazos del juzgado)
- Capas o patrones que no resuelven un problema que ya existe

La arquitectura existe para resolver problemas, no para crear trabajo
extra. **Sugerir sobre-ingeniería es un hallazgo tan malo como no ver un
bug.** La única excepción es el aislamiento entre tenants: ahí se agregan
capas de más a propósito, porque el modo de falla no admite segundas
oportunidades.
