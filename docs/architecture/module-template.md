# Template de Módulo

Estructura canónica para todo módulo nuevo. Un módulo nace completo o no
nace.

## Objetivo

Que no haya decisión que tomar sobre dónde va un archivo. Si hay
ambigüedad, la IA la resuelve distinto cada vez y en tres semanas el
proyecto tiene cuatro convenciones conviviendo.

Todo módulo nuevo debe pasar `pnpm check` y `pnpm test` sin excepciones
manuales.

---

## Estructura mínima

```text
src/modules/constancias/
├── index.ts                      API pública del módulo
├── types.ts                      Contratos públicos
├── domain/
│   ├── index.ts
│   ├── constancia.ts             Entidad y reglas
│   ├── folio.ts                  Value object
│   └── ports.ts                  Interfaces que el módulo necesita
├── application/
│   ├── index.ts
│   ├── emitir-constancia.ts      Un caso de uso por archivo
│   └── reimprimir-constancia.ts
├── infrastructure/
│   ├── index.ts
│   ├── constancia.repository.ts  Implementa el puerto
│   └── schema.ts                 Tablas Drizzle del módulo
└── ui/
    ├── index.ts
    ├── EmitirConstancia.tsx
    └── components/
```

---

## Obligatorio

1. `index.ts` en la raíz — la única puerta de entrada al módulo
2. `types.ts` en la raíz — contratos públicos
3. Las cuatro capas, aunque alguna arranque casi vacía
4. `index.ts` en cada capa
5. `domain/ports.ts` si el módulo necesita algo de afuera

## Opcional

- `ui/components/` si hay UI reutilizable propia del módulo
- Subcarpetas dentro de una capa cuando el volumen lo justifique

Si usás subcarpetas, agregá `index.ts` local. Nunca se importa un archivo
concreto de otro módulo.

---

## Dirección de dependencias

```text
ui ──► application ──► domain ◄── infrastructure
```

**`domain` no importa nada.** Ni Next.js, ni Drizzle, ni React. Es lógica
de negocio pura, y por eso se testea en milisegundos sin base de datos.

Tabla completa de qué puede importar cada capa en
[Estructura §3](./estructura.md#3-capas-y-dirección-de-dependencias).
Enforzado por `dependency-cruiser`: violarlo rompe el build.

---

## Flujo canónico

```text
app/(panel)/constancias/emitir/page.tsx      Ruta fina
  └─► <EmitirConstancia />                    ui/
        └─► emitirConstancia(input)           application/
              └─► ConstanciaRepository        infrastructure/
                    └─► withTenant(tx => ...) shared/tenancy
```

La ruta de `app/` es fina. Solo composición:

```tsx
// app/(panel)/constancias/emitir/page.tsx
import { EmitirConstancia } from "@/modules/constancias";

export default function EmitirConstanciaPage() {
  return <EmitirConstancia />;
}
```

---

## Qué va en cada capa

### `domain/`

- Entidades y value objects
- Reglas de negocio puras
- Puertos (interfaces) de lo que el módulo necesita del exterior
- Errores de dominio

No va:

- acceso a base de datos
- llamadas HTTP
- nada que importe del framework

```ts
// domain/folio.ts
export class Folio {
  private constructor(private readonly valor: string) {}

  static crear(prefijo: string, anio: number, consecutivo: number): Folio {
    if (consecutivo < 1) throw new FolioInvalidoError(consecutivo);
    const secuencia = String(consecutivo).padStart(6, "0");
    return new Folio(`${prefijo}-${anio}-${secuencia}`);
  }

  toString(): string {
    return this.valor;
  }
}
```

### `application/`

- Un caso de uso por archivo, con nombre de verbo
- Orquestación entre puertos
- Transacciones

No va:

- SQL
- JSX
- detalles del ORM

### `infrastructure/`

- Implementación de los puertos
- Esquema Drizzle del módulo
- Adaptadores a servicios externos

Todo acceso a base de datos pasa por el helper de tenancy:

```ts
// infrastructure/constancia.repository.ts
export class ConstanciaRepository implements ConstanciaPort {
  async guardar(constancia: Constancia): Promise<void> {
    await withTenant(async (tx) => {
      await tx.insert(constanciasTable).values(toRow(constancia));
    });
  }
}
```

### `ui/`

- Componentes y vistas del módulo
- Server Components por defecto; `"use client"` solo donde haga falta

No va:

- acceso directo a base de datos
- lógica de negocio

---

## Comunicación entre módulos

Un módulo **no importa de otro módulo directamente**. Si `apoyos` necesita
datos de `padron`, declara un puerto en su propio dominio:

```ts
// modules/apoyos/domain/ports.ts
export interface PersonaLookupPort {
  buscarPorId(id: PersonaId): Promise<PersonaResumen | null>;
}
```

La implementación vive en `modules/apoyos/infrastructure/` y adentro usa la
API pública de `padron`. Así el dominio de `apoyos` no sabe que `padron`
existe, y se testea con un mock trivial.

---

## Barrel de raíz

```ts
// src/modules/constancias/index.ts
export * from "./application";
export * from "./ui";
export type * from "./types";
```

`domain` e `infrastructure` **no** se exportan hacia afuera. El resto del
sistema consume casos de uso y UI, nunca entidades ni repositorios.

---

## Checklist de creación

1. Crear el árbol completo con las cuatro capas
2. Crear `index.ts` y `types.ts` de raíz
3. Escribir el test de dominio **antes** de la entidad
4. Escribir el test de caso de uso con puertos mockeados
5. Si agrega tabla: `ayuntamiento_id`, política RLS y test de aislamiento
   en el mismo commit
6. Crear la ruta fina en `app/`
7. Exportar por los barrels
8. Correr `pnpm check` y `pnpm test`

---

## Antipatrones

- `app/**/page.tsx` con lógica adentro en vez de composición
- `domain/` importando Drizzle, Next.js o React
- Caso de uso que arma SQL
- Componente que abre transacción
- `modules/apoyos/domain/` importando `modules/padron/domain/`
- Importar un archivo concreto de otro módulo en vez de su `index.ts`
- Tabla nueva sin test de aislamiento
- Módulo creado con dos capas "por ahora"
