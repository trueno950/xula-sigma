# Estructura y Stack

Organización general del proyecto y decisiones de herramientas.

Este documento cubre el **conjunto**. Para crear un módulo concreto, ver
[Template de Módulo](./module-template.md).

---

## 1. Por qué feature-first

El proyecto se desarrolla con asistencia de IA, y eso cambia qué
organización conviene.

Una IA no recuerda la convención que se acordó hace tres sesiones. Si hay
ambigüedad sobre dónde va un archivo, lo pone en cualquier lado, y en tres
semanas conviven cuatro criterios. **La estructura tiene que ser tan obvia
que no haya decisión que tomar.**

Por eso la carpeta grita qué hace el sistema, no con qué está hecho.
Alguien que abre `src/modules/` ve *constancias, padrón, apoyos, juzgado* y
entiende el producto en cinco segundos. Si viera *controllers, services,
models*, no sabría si es un sistema municipal o una tienda de zapatos.

Y para la IA el beneficio es directo: cuando se pide "agregá validación de
folio", la ubicación es inequívoca. No hay decisión, por lo tanto no hay
decisión que errar.

---

## 2. Árbol general

```text
src/
  modules/
    padron/            Personas y domicilios
    constancias/       Constancias y oficios
    reportes/          Reportes ciudadanos
    apoyos/            Apoyos sociales y de traslado
    operacion/         Viajes, flotilla, permisos, combustible
    campanias/         Descacharrización y fumigación
    juzgado/           Libro digital del juzgado de paz
    portal/            Noticias, avisos y consulta pública

  shared/
    tenancy/           Resolución de tenant y acceso a BD
    auth/              Sesión y roles
    exportacion/       Entrega de los datos de un ayuntamiento
    ui/                Design system y primitivos
    lib/               Utilidades transversales

  app/                 Next.js App Router. Solo routing y composición.
```

Cada módulo se abre en cuatro capas. Ver
[Template de Módulo](./module-template.md).

`src/app/` es fino: rutas que componen UI de módulos, nada más. Si una
ruta tiene lógica adentro, está mal ubicada.

---

## 3. Capas y dirección de dependencias

Tabla canónica. Cualquier otro documento que hable de capas apunta acá.

```text
ui ──► application ──► domain ◄── infrastructure
```

| Capa | Importa de | Nunca importa de |
|---|---|---|
| `domain` | nada | application, infrastructure, ui, **shared** |
| `application` | domain, shared | infrastructure, ui |
| `infrastructure` | domain, application, shared | ui |
| `ui` | application, domain, shared | infrastructure |

**`domain` no importa nada.** Ni Next.js, ni Drizzle, ni React. Es lógica
de negocio pura, y por eso se testea en milisegundos sin base de datos ni
navegador.

**Tampoco importa de `shared`,** y esa es la parte que se pasa por alto.
`shared` parece inocuo —son "utilidades"— pero adentro vive `tenancy`, que
abre conexiones a Postgres. Un dominio que importa de ahí deja de ser puro
sin que se note en la firma de la función. La excepción se abre una vez y
se acabó la regla.

Si el dominio necesita algo de `shared`, ese algo no era de `shared`: era
del dominio, y va copiado adentro. Duplicar cuatro líneas es más barato que
perder la pureza de la capa.

Las otras tres capas sí pueden. `application` toma los errores
transversales de `shared/lib/errors`, `infrastructure` toma `withTenant` de
`shared/tenancy`, y `ui` toma el design system de `shared/ui`.

`application` define puertos; `infrastructure` los implementa. El caso de
uso no sabe si detrás hay Postgres, un archivo o un mock.

Un módulo tampoco importa de otro módulo directamente. Si `apoyos` necesita
datos de `padron`, va por un puerto declarado en su propio dominio.

### Enforzado, no sugerido

Estas reglas viven en `.dependency-cruiser.cjs` y corren en pre-push y en
CI (`pnpm layers`). Violarlas rompe el build. No es una convención que se
recuerda: es un error de compilación.

Un detalle de mantenimiento: dependency-cruiser **no soporta TypeScript 7**
todavía. Con TS 7 instalado emite `missing-typescript-transpiler`, avisa
que probablemente no vio las fuentes… y devuelve exit 0 con "no dependency
violations found". O sea, el enforcement queda muerto y el build en verde.
Por eso `typescript` está fijado en `^6.0.3`. Ver ADR 0001.

---

## 4. Stack

| Área | Elección | Razón |
|---|---|---|
| Framework | Next.js (App Router) | Server Components, un solo despliegue |
| Lenguaje | TypeScript `strict` | `any` prohibido salvo excepción justificada |
| Base de datos | PostgreSQL | RLS. Es la razón principal, no una preferencia. |
| ORM | Drizzle | Control explícito de la transacción, necesario para `SET LOCAL`. Prisma mete su propia capa de conexión y complica el manejo de RLS. |
| Validación | Zod | Un esquema, tipo y validación en runtime |
| Estado cliente | Zustand | Solo estado de UI. Server Components primero. |
| Estilos | Tailwind | Variables CSS para marca blanca |
| Componentes | shadcn/ui | Se copian al repo. Tematizables por variable CSS. |
| Iconos | `@phosphor-icons/react` | Set único; reemplaza a Lucide en los componentes shadcn |
| Formularios | React Hook Form + Zod | El mismo esquema valida en cliente y servidor |
| Tablas | TanStack Table | Headless: lógica sin imponer markup |
| PDF | `@react-pdf/renderer` | Sin navegador headless. Ver [Frontend §9](../06-frontend.md) |
| Tests unitarios | Vitest | |
| Tests E2E | Playwright | Flujos críticos y aislamiento entre tenants |
| Lint y formato | Biome | Una herramienta en lugar de ESLint + Prettier |
| Límites de capa | dependency-cruiser | Independiente del linter |
| Assets | Cloudflare R2 | El filesystem de Railway es efímero |
| Hosting | Railway | Migrable a VPS al escalar |

La elección de Postgres y Drizzle está subordinada al aislamiento entre
municipios. Ver
[Invariantes Críticos](./invariantes-criticos.md).

---

## 5. Control de versiones

- Repositorio en GitHub, privado
- `main` siempre desplegable
- Ramas por trabajo: `feat/constancias-folio`, `fix/rls-pooler`
- Conventional commits en español, sin atribución de IA
- Un commit es una unidad revisable: incluye su test y su documentación
- PR obligatorio hacia `main`, aunque el equipo sea de una sola persona —
  el PR es donde se lee el diff completo antes de que entre

### Automatización

| Momento | Qué corre |
|---|---|
| Pre-commit | Biome, typecheck, tests de los archivos tocados |
| Pre-push | Suite completa, dependency-cruiser |
| CI en PR | Todo lo anterior + integración + E2E + test de esquema RLS + validación de links de docs |

Detalle de gates y checklists en [Calidad](../04-calidad.md).

---

## 6. Dónde vive cada tema

Un tema, un solo documento. Si buscás algo que no está acá, está en uno de
estos:

| Tema | Documento |
|---|---|
| Aislamiento entre municipios, folios, datos sensibles | [Invariantes Críticos](./invariantes-criticos.md) |
| Crear un módulo, qué va en cada capa | [Template de Módulo](./module-template.md) |
| SOLID, KISS, YAGNI, regla de oro | [Principios](../01-principios.md) |
| Nombres, idioma del código, commits | [Nomenclatura](../02-nomenclatura.md) |
| Qué no hacer y cómo se corrige | [Antipatrones](../03-antipatrones.md) |
| Testing, métricas, checklists | [Calidad](../04-calidad.md) |
| Auth, roles, datos personales | [Seguridad](../05-seguridad.md) |
| RSC, estado, marca blanca, formularios, PDF | [Frontend](../06-frontend.md) |
| Reglas operativas de sesión con IA | [CLAUDE.md](../../CLAUDE.md) |
| Alcance y fases del producto | [Roadmap](../../ROADMAP.md) |
| Auth, migraciones, errores, Server Actions, logging, fecha y hora, hooks | [ADR 0001](../adr/0001-decisiones-tecnicas-fase-0.md) |
