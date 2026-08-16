# 03 — Antipatrones Prohibidos

Lista con su corrección. Si aparece en un PR, no entra.

---

## Tabla

| # | Antipatrón | ¿Por qué? | Alternativa |
|---|---|---|---|
| 1 | `any` | Pierde todo el tipado | `unknown` + type guard |
| 2 | Conexión a base de datos sin `withTenant` | Sin contexto de tenant no hay aislamiento | Siempre por `shared/tenancy` |
| 3 | `SET` en vez de `SET LOCAL` | Se queda pegado en el pooler y lo hereda otro municipio | `SET LOCAL` dentro de transacción |
| 4 | `ayuntamiento_id` recibido del cliente | Es manipulable | Del contexto de sesión del servidor |
| 5 | Tabla nueva sin RLS | Fuga silenciosa entre municipios | Política RLS + test de aislamiento |
| 6 | `domain/` importando Drizzle, Next o React | Rompe la capa pura | Puertos e inversión de dependencias |
| 7 | SQL en el caso de uso | Viola separación de capas | Repositorio |
| 8 | Importar `modules/x/domain` desde otro módulo | Acopla dominios | Puerto propio + adaptador |
| 9 | Secuencia de base de datos para folios | Deja huecos al hacer rollback | Contador por tenant con lock en transacción |
| 10 | 403 al pedir recurso de otro tenant | Confirma que existe | 404 |
| 11 | Texto libre donde puede ir dato sensible | Dato sensible sin protección | Categoría cerrada tipada |
| 12 | Asset subido al filesystem del contenedor | Es efímero, desaparece en el redeploy | Object storage |
| 13 | Colores de marca aplicados en cliente | Parpadeo con la marca por defecto | Inyección en servidor |
| 14 | `try/catch` que traga el error | Bugs invisibles | Manejo específico o re-throw |
| 15 | Más de 3 niveles de anidación | Ilegible | Early returns |
| 16 | Nombres vagos: `data`, `temp`, `info` | No dicen nada | Nombre del concepto |
| 17 | Comentario que explica código obvio | Ruido | Código autoexplicativo |
| 18 | `"use client"` por defecto | JS de más en redes lentas | Server Component salvo justificación |
| 19 | Entrada sin validar con Zod | Datos inconsistentes | Esquema Zod en el borde |
| 20 | Acentos o eñes en identificadores | Rompe herramientas y SQL | Sin diacríticos |
| 21 | Módulo creado con capas incompletas | Deriva estructural | Las cuatro capas desde el inicio |
| 22 | Dependencia nueva sin justificar | Superficie de mantenimiento permanente | Justificar en el PR |

---

## Correcciones detalladas

### 1. `any`

```ts
// ❌
function procesar(dato: any) {
  return dato.nombre;
}

// ✅
function procesar(dato: unknown) {
  if (esPersona(dato)) return dato.nombre;
  throw new DatoInvalidoError();
}

function esPersona(dato: unknown): dato is Persona {
  return typeof dato === "object" && dato !== null && "nombre" in dato;
}
```

### 2 y 3. Acceso a base de datos y `SET LOCAL`

```ts
// ❌ conexión directa, sin contexto de tenant
const filas = await db.select().from(constanciasTable);

// ❌ SET sin LOCAL — sobrevive a la transacción y viaja por el pooler
await db.execute(sql`SET app.tenant = ${tenantId}`);

// ✅
await withTenant(async (tx) => {
  await tx.execute(sql`SET LOCAL app.tenant = ${tenantId}`);
  return tx.select().from(constanciasTable);
});
```

Este es el bug más caro del proyecto y **no aparece en desarrollo**.
Aparece en producción, con dos clientes, cuando el pooler reutiliza una
conexión.

### 4. `ayuntamiento_id` del cliente

```ts
// ❌
export async function emitirConstancia(input: { ayuntamientoId: string; ... }) {
  // el cliente manda el ayuntamiento que quiera
}

// ✅
export async function emitirConstancia(input: EmitirConstanciaInput) {
  const { ayuntamientoId } = await getTenantContext(); // del servidor
}
```

### 6. `domain` importando el framework

```ts
// ❌ domain/constancia.ts
import { constanciasTable } from "../infrastructure/schema";

// ✅ domain/ports.ts
export interface ConstanciaPort {
  guardar(constancia: Constancia): Promise<void>;
  buscarPorFolio(folio: Folio): Promise<Constancia | null>;
}
```

El dominio define lo que necesita. La infraestructura se acomoda.

### 9. Folios sin huecos

```ts
// ❌ BIGSERIAL — un rollback consume el número y deja hueco
folio: bigserial("folio")

// ✅ contador por tenant, con lock, en la misma transacción
await withTenant(async (tx) => {
  const [contador] = await tx
    .select()
    .from(foliosTable)
    .where(eq(foliosTable.tipo, "constancia"))
    .for("update");

  const siguiente = contador.ultimo + 1;
  await tx.update(foliosTable).set({ ultimo: siguiente });
  await tx.insert(constanciasTable).values({ folio: siguiente, ... });
});
```

Si la transacción falla, el folio no se consumió. Un hueco en una serie de
documentos oficiales es una pregunta incómoda en una revisión.

### 10. 404 en vez de 403

```ts
// ❌ confirma que el recurso existe en otro municipio
if (constancia.ayuntamientoId !== tenantId) throw new ForbiddenError();

// ✅ con RLS activo simplemente no aparece
const constancia = await repo.buscarPorId(id);
if (!constancia) notFound();
```

### 11. Texto libre con dato sensible

```ts
// ❌
type ApoyoTraslado = { motivo: string };
// alguien escribe "diálisis martes y jueves, hospital O'Horán"

// ✅
type ApoyoTraslado = {
  motivo: "salud" | "educacion" | "tramite" | "defuncion" | "otro";
  observaciones?: string; // sin dato clínico, y así documentado
};
```

### 14. `try/catch` que traga

```ts
// ❌
try {
  await emitir(constancia);
} catch {
  // el cajero ve la pantalla en blanco y nadie sabe por qué
}

// ✅
try {
  await emitir(constancia);
} catch (error) {
  if (error instanceof FolioDuplicadoError) return reintentar();
  if (error instanceof ValidacionError) return mostrarError(error);
  throw error;
}
```

### 15. Anidación

```ts
// ❌
function procesar(solicitud: Solicitud) {
  if (solicitud.esValida) {
    if (solicitud.persona) {
      if (solicitud.persona.isVigente) {
        // ...
      }
    }
  }
}

// ✅
function procesar(solicitud: Solicitud) {
  if (!solicitud.esValida) return;
  if (!solicitud.persona) return;
  if (!solicitud.persona.isVigente) return;
  // ...
}
```

### 18. `"use client"` por defecto

```tsx
// ❌ el módulo entero se va al cliente
"use client";
export function ListaConstancias({ items }) { ... }

// ✅ servidor por defecto; solo lo interactivo va al cliente
export function ListaConstancias({ items }) {
  return (
    <>
      {items.map((i) => <FilaConstancia key={i.id} item={i} />)}
      <BotonReimprimir />  {/* este sí es "use client" */}
    </>
  );
}
```

Esto no es purismo. Es tiempo de carga en la red móvil de un municipio
rural.
