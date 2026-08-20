# 06 — Frontend

Convenciones de UI, estado, formularios y generación de documentos.

---

## 1. Stack

| Área | Elección | Razón |
|---|---|---|
| Framework | Next.js App Router | Server Components |
| Estilos | Tailwind | Variables CSS para marca blanca |
| Componentes | shadcn/ui | Se copian al repo, no son dependencia. Tematizables por variable CSS. |
| Formularios | React Hook Form + Zod | El mismo esquema valida en cliente y servidor |
| Tablas | TanStack Table | Headless: la lógica de tabla sin imponer markup |
| Iconos | `@phosphor-icons/react` | Set único. Ver sección 7. |
| Estado cliente | Zustand | Solo estado de UI, y poco |
| Estado servidor | — | Lo resuelve RSC. Ver sección 3. |
| PDF | `@react-pdf/renderer` | Sin navegador headless. Ver sección 9. |
| QR | `qrcode` | Genera data URI, se embebe en el PDF |

### Next.js 16 — lo que cambia respecto de 15

Arrancamos en 16, no en 15. La mayoría de los tutoriales y del material de
entrenamiento todavía describe 15, así que estas diferencias hay que
tenerlas presentes.

| Cambio | Impacto |
|---|---|
| **`middleware.ts` → `proxy.ts`** | Renombrado. Misma firma `(request: NextRequest)` y mismo `config.matcher`. Nuestra resolución de tenant vive acá. |
| **Async Request APIs obligatorias** | `cookies()`, `headers()`, `params` y `searchParams` **solo** son accesibles con `await`. En 15 había compatibilidad síncrona; en 16 se eliminó. |
| **Turbopack por defecto** | `next dev` y `next build` lo usan sin configuración |
| **React Compiler estable** | Memoiza automáticamente. Sin `useMemo` ni `useCallback` manuales salvo caso medido. |
| **`"use cache"`** | Reemplaza `unstable_cache`, `fetchCache` y `revalidate` de segmento. `cacheLife` y `cacheTag` ya no llevan prefijo `unstable_`. Se habilita con `cacheComponents: true`. |
| **Node.js 20.9+** | Requisito mínimo de Next 16. El proyecto fija **26.7.0** en `.nvmrc` — ver más abajo. |

**Por qué Node 26 y no la LTS activa de hoy.** El 2026-10-20 la línea 24
entra en mantenimiento (solo parches de seguridad hasta 2028-04-30) y el
2026-10-28 la 26 pasa a LTS activa, con soporte hasta 2029-04-30. XULA
SIGMA sale a producción después de esa fecha: fijar 24 sería nacer en una
línea que en dos meses deja de recibir features y muere antes que el
sistema. La ventana en que la 26 todavía es *Current* es de dos meses y no
tiene costo real: Next, Vitest y Drizzle ya la declaran soportada, y
`@node-rs/argon2` compila contra N-API, que es estable entre versiones de
Node y no exige recompilar por major.

La versión vive en `.nvmrc` y **los tres entornos la leen de ahí**: local
vía `nvm use`, CI vía `node-version-file: .nvmrc`, y Railway vía el
detector de su builder. Ese es el punto del archivo — no es preferencia de
versión, es que local, CI y producción no puedan divergir en silencio.

```ts
// proxy.ts — en la raíz del proyecto o en src/
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const tenant = resolverTenantDesdeHost(request.headers.get("host"));
  // ...
}

export const config = { matcher: "/((?!_next/static|_next/image).*)" };
```

```ts
// Todo acceso a request es asíncrono
const cookieStore = await cookies();
const headerList = await headers();
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
}
```

---

## 2. Servidor primero

Regla de partida: **todo componente es Server Component salvo que necesite
lo contrario.**

`"use client"` es una decisión que se justifica, no el punto de arranque.
Se agrega cuando el componente necesita:

- eventos (`onClick`, `onChange`)
- hooks de estado o efecto
- APIs del navegador

Y se agrega **en la hoja del árbol**, no en la raíz. Marcar un layout como
cliente arrastra todo lo que cuelga de él.

```tsx
// ❌ el módulo entero se va al cliente
"use client";
export function ListaConstancias({ items }) { ... }

// ✅ el listado queda en servidor, solo el botón cruza
export function ListaConstancias({ items }) {
  return (
    <ul>
      {items.map((i) => (
        <li key={i.id}>
          {i.folio}
          <BotonReimprimir id={i.id} />  {/* este sí es "use client" */}
        </li>
      ))}
    </ul>
  );
}
```

Esto no es purismo. Es tiempo de carga en la red móvil de un municipio
rural, que es donde va a correr esto de verdad.

---

## 3. Jerarquía de estado

```text
┌──────────────────────────────────────────────────────────────┐
│ 0. Server Component  → el dato viene del servidor            │
│ 1. useState          → estado local del componente           │
│ 2. useXScreen()      → estado derivado y orquestación        │
│ 3. Zustand           → estado de UI compartido entre vistas  │
└──────────────────────────────────────────────────────────────┘

Empezar en 0. Subir solo cuando el nivel anterior no alcanza.
```

| Pregunta | Respuesta | Nivel |
|---|---|---|
| ¿El dato viene de la base? | Sí | 0 — Server Component |
| ¿Es estado de un solo componente? | Sí | 1 — `useState` |
| ¿Varios componentes de la misma pantalla lo comparten? | Sí | 2 — hook facade |
| ¿Se necesita en pantallas distintas? | Sí | 3 — Zustand |

**No hay capa de estado de servidor en el cliente.** Los datos llegan
renderizados y las mutaciones van por Server Actions con
`revalidatePath`. No agregamos TanStack Query ni equivalente hasta que
aparezca una necesidad concreta — búsqueda incremental, actualización
optimista — y esa necesidad se justifica en el PR.

El estado de Zustand va a ser poco: filtros abiertos, modales, preferencias
de vista. La sesión vive en cookie del servidor y el tenant se resuelve en
el proxy. Nada de eso es estado de cliente.

---

## 4. Container y Presentational

El patrón sigue vigente, pero el framework lo enforza en lugar de la
disciplina: **el límite Server/Client es el límite Container/Presentational.**

| Rol | Implementación |
|---|---|
| Container | Server Component. Trae datos, decide, compone. |
| Presentational | Client Component. Recibe props, pinta, avisa hacia arriba. |

```tsx
// Container — servidor
export async function DetalleConstancia({ id }: { id: ConstanciaId }) {
  const constancia = await obtenerConstancia(id);
  if (!constancia) notFound();
  return <ConstanciaCard constancia={constancia} />;
}

// Presentational — cliente, solo si necesita interacción
"use client";
export function ConstanciaCard({ constancia }: ConstanciaCardProps) {
  return <article>...</article>;
}
```

Un Client Component **no** hace fetch de sus propios datos. Los recibe.

---

## 5. Estructura

La UI de un módulo vive en su capa `ui/`:

```text
src/modules/constancias/ui/
├── index.ts
├── EmitirConstancia.tsx          Entrypoint de la vista
├── components/
│   ├── index.ts
│   ├── FormularioConstancia.tsx
│   └── PreviewConstancia.tsx
└── hooks/
    ├── index.ts
    └── useEmitirConstancia.ts     Hook facade
```

Lo compartido entre módulos vive en `src/shared/ui/`:

```text
src/shared/ui/
├── primitives/     shadcn/ui — button, dialog, input, table...
├── layout/         Shell, sidebar, header
└── branding/       Proveedor de marca blanca
```

**No existe una carpeta `components/` global.** Un componente vive en su
módulo hasta que dos módulos distintos lo necesitan; recién ahí sube a
`shared/ui/`.

Esa regla existe por una razón concreta: el proyecto del que portamos estos
estándares empezó organizando por tipo de archivo y tuvo que migrar a
feature-first a mitad de camino, dejando carpetas marcadas como *"legado"*.
Arrancar bien es gratis; migrar después no.

### Hook facade

Cuando una vista coordina varias piezas, un solo hook orquesta y los
componentes reciben props.

```ts
export function useEmitirConstancia() {
  const persona = usePersonaSeleccionada();
  const plantilla = usePlantillaSeleccionada();
  const envio = useEnvioConstancia();

  return { persona, plantilla, envio, puedeEmitir: ... };
}
```

Un hook = una responsabilidad. Si `useEmitirConstancia` maneja búsqueda,
validación y envío, son tres hooks.

---

## 6. Marca blanca

Cada ayuntamiento ve su escudo y sus colores. Sin código por municipio.

shadcn/ui se eligió precisamente por esto: sus componentes se estilan con
variables CSS, no con clases fijas. Cambiar `--primary` cambia botones,
foco, enlaces y estados activos de toda la aplicación de una sola vez. Con
una librería empaquetada esto sería una pelea; acá es el mecanismo previsto.

### Inyección en servidor

El tenant se resuelve en el proxy y sus colores se escriben en el
`<html>` **antes** de enviar la respuesta.

```tsx
// app/layout.tsx
export default async function RootLayout({ children }) {
  const { colores, escudoUrl, nombre } = await getTenantBranding();

  return (
    <html
      lang="es"
      style={{
        "--primary": colores.primario,
        "--primary-foreground": colores.primarioTexto,
        "--accent": colores.secundario,
      } as CSSProperties}
    >
      <body>{children}</body>
    </html>
  );
}
```

**Nunca en el cliente.** Si los colores se aplican después de hidratar, el
usuario ve medio segundo con la marca por defecto y después cambia. Se ve
barato, y en una demo frente a un tesorero eso importa.

### Contraste

Los colores los elige el municipio y algunos van a elegir mal. Un botón
guinda con texto negro ilegible es un problema de accesibilidad que no
podemos delegar al cliente.

`shared/ui/contraste.ts` mide la razón de WCAG 2 y `leerMarca` exige **4.5**
—texto normal, no el 3.0 de texto grande— porque `--primary` no pinta solo
botones: pinta enlaces y estados de foco. Si el par no alcanza, se descarta
la marca **entera** y quedan los valores por defecto. Descartar solo el
color que falla dejaría un par que el municipio nunca eligió.

El par que se mide es `--primary` contra `--primary-foreground`, y cuando la
marca trae uno solo, el que falta se toma del valor por defecto de
`globals.css`. Ese es el caso más probable: el municipio carga su color y no
toca el del texto.

**Solo entran colores medibles.** La lista blanca acepta `oklch(...)` y
`#rgb`/`#rrggbb`; quedaron afuera los nombres de CSS y el hex con alfa. Un
nombre pide cargar la tabla de los 148 de la especificación, y el contraste
de un color translúcido depende de lo que tenga atrás. Aceptar en la lista
blanca algo que no se puede medir vacía la garantía justo para quien
escribió el color a mano.

`--accent` queda fuera de la validación mientras el esquema no declare su
color de texto: sin par, no hay contraste que medir.

### Assets

Escudo y logotipo en object storage, nunca en el filesystem del contenedor.
Ver [Seguridad §9](./05-seguridad.md).

---

## 7. Iconografía

**Set único: `@phosphor-icons/react`.**

### Un solo set, sin excepciones

shadcn/ui trae Lucide en sus componentes por defecto. Como los componentes
se copian a nuestro repo, **se reemplazan los iconos al copiarlos**: los
chevrons del `Select`, el check del `Checkbox`, la X del `Dialog`. Son unos
pocos y es una sola vez.

Dos sets conviviendo se nota: distinta grilla, distinto grosor de trazo,
distinto radio en las esquinas. En una pantalla operativa que alguien mira
ocho horas por día, eso lee como descuido.

### Pesos

Phosphor tiene seis pesos y ahí está la trampa: mezclarlos sin criterio.

| Peso | Uso |
|---|---|
| `regular` | Todo, por defecto |
| `fill` | Estado activo o seleccionado — pestaña actual, item de menú activo |
| `bold` | Solo si un icono necesita competir con texto grande |

`thin`, `light` y `duotone` no se usan sin justificar el motivo en el PR.

### Tamaños

Por token, no números sueltos.

```tsx
const ICON = { sm: 16, md: 20, lg: 24 } as const;

<FileText size={ICON.md} />
```

Un `size={17}` en un archivo es deriva empezando.

### Emoji: prohibido

Nunca como icono de interfaz. Los motivos son concretos:

- Se dibuja distinto en cada sistema operativo. Windows, macOS y Android
  muestran glifos diferentes; el operador del municipio está en Windows.
- No se puede colorear ni alinear con el resto de la interfaz
- El lector de pantalla lo anuncia con su nombre Unicode, que rara vez
  coincide con la intención
- En una herramienta de gobierno lee como improvisado

### SVG inline: solo para lo que no es icono

El escudo municipal y el logotipo **no son iconos, son assets de marca**.
Van por object storage y `next/image`, no en el árbol de componentes. Ver
sección 6.

SVG inline propio solo se justifica si el set no tiene el concepto y se
documenta por qué.

### Accesibilidad

Obligatorio, y en un producto de gobierno con más razón.

```tsx
// Decorativo — acompaña a un texto que ya dice todo
<span><FileText aria-hidden size={ICON.sm} /> Constancias</span>

// Icono solo — necesita nombre accesible
<Button aria-label="Reimprimir constancia">
  <Printer aria-hidden size={ICON.md} />
</Button>
```

**Ninguna acción destructiva o crítica se representa solo con un icono.**
Cancelar una constancia, borrar un registro o cerrar un asunto llevan icono
**más texto**. El personal municipal no es usuario experto y no tiene por
qué adivinar qué hace un símbolo.

### Server Components

Importar desde el punto de entrada compatible con SSR de la librería, no
desde la raíz, para no arrastrar el componente al cliente sin necesidad.
**Verificar el import correcto contra la documentación de la versión que
instalemos** antes de dejarlo en el código: es un detalle que cambió entre
versiones mayores.

Y agregar el paquete a `optimizePackageImports` en `next.config`. Sin eso,
el barrel de un set de miles de iconos hace lentísima la compilación en
desarrollo.

---

## 8. Formularios y tablas

### Formularios — React Hook Form + Zod

El esquema Zod se escribe una vez y sirve en los dos lados.

```ts
// modules/padron/domain/schemas.ts
export const RegistrarPersonaSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").max(150),
  curp: z.string().length(18).optional(),
  domicilioId: z.string().uuid(),
});

// ui/ — validación en cliente
const form = useForm({ resolver: zodResolver(RegistrarPersonaSchema) });

// application/ — validación en servidor, la que de verdad importa
const datos = RegistrarPersonaSchema.parse(input);
```

La validación de cliente es comodidad. **La de servidor es la seguridad.**
Nunca se elimina una por tener la otra.

Los mensajes de error van en el esquema, en español, redactados para
alguien que no es técnico. No `"Invalid input"`.

### Tablas — TanStack Table

Padrón, constancias, reportes, apoyos, campañas: todo es lista con filtro,
orden y paginación. Es headless — aporta la lógica y el markup es nuestro,
con los primitivos de shadcn.

Reglas:

- Paginación **en servidor** para cualquier listado que pueda superar 100
  filas. El padrón de un municipio no se manda entero al navegador.
- La definición de columnas vive junto a la vista, no en un archivo global
- Una tabla no ejecuta cálculos de negocio: recibe los datos ya calculados

---

## 9. Generación de PDF

**Decisión: `@react-pdf/renderer`.**

### Por qué, y no un navegador headless

La alternativa obvia es renderizar HTML con Puppeteer o Playwright. Se
descarta por el contexto de despliegue:

| Criterio | Navegador headless | `@react-pdf/renderer` |
|---|---|---|
| Memoria por documento | Pico de cientos de MB | Decenas de MB |
| Imagen de despliegue | Chromium + dependencias del sistema | Solo Node |
| Arranque en frío | Segundos | Inmediato |
| Costo en Railway | Sube con cada emisión | Marginal |
| Determinismo | Depende de versión del navegador | Mismo input, mismo PDF |

Somos multi-tenant sobre recursos compartidos. Un pico de memoria de
cientos de megas cada vez que un cajero emite una constancia es la forma
equivocada de gastar la instancia, y afecta a todos los municipios a la
vez, no solo al que emitió.

Y una constancia es un documento de **estructura fija y simple**: encabezado
con escudo, cuerpo de texto, folio, firma, QR. Es exactamente lo que
`@react-pdf/renderer` hace bien.

### El costo que aceptamos

No se puede reutilizar Tailwind. Las plantillas se estilan con el sistema
propio de la librería, que es un subconjunto de flexbox. Para un puñado de
plantillas es aceptable; si algún día son treinta, se revisa.

### Cuándo revisar la decisión

Si un municipio exige replicar con exactitud un membrete complejo que ya
tiene en PDF. Ahí la respuesta no es Puppeteer sino `pdf-lib` estampando
campos sobre su archivo original.

### No se guarda el PDF

Se guarda **el snapshot de los datos renderizados más la versión de
plantilla**. La reimpresión regenera de forma determinista.

Motivo: si guardáramos solo los datos y la plantilla cambiara, una
reimpresión saldría distinta del original — inaceptable en un documento
oficial. Y guardar el binario cuesta almacenamiento y complica el borrado.
El snapshot resuelve las dos cosas.

La marca de agua `REIMPRESIÓN` es un parámetro de renderizado, no un
documento distinto.

---

## 10. Rendimiento

El contexto real: redes móviles rurales, equipos viejos en el palacio
municipal.

| Métrica | Objetivo |
|---|---|
| Carga inicial en banda ancha | < 1.2 s |
| Carga inicial en 3G/4G rural | < 2.5 s |
| Respuesta al emitir un documento | < 2 s |

Consecuencias prácticas:

- Server Components por defecto reduce el JavaScript enviado
- Sin animaciones decorativas: entorpecen el trabajo del operador y cuestan
  batería y CPU
- Imágenes por `next/image`, escudos servidos ya redimensionados
- Sin fuentes externas: se autoalojan o se usa la del sistema
- Paginación en servidor siempre

---

## 11. Antipatrones

| # | Antipatrón | Alternativa |
|---|---|---|
| 1 | `"use client"` en un layout o en la raíz de una vista | En la hoja que lo necesita |
| 2 | Client Component haciendo fetch de sus datos | Los recibe del Server Component |
| 3 | Colores de marca aplicados tras hidratar | Inyección en servidor |
| 4 | Carpeta `components/` global | En el módulo hasta que dos lo compartan |
| 5 | Traer el padrón completo al navegador | Paginación en servidor |
| 6 | Validar solo en cliente | Zod en servidor siempre |
| 7 | Mensaje de error técnico visible al usuario | Redactado para un operador |
| 8 | Cálculo de negocio dentro de un componente | En dominio; la UI recibe el resultado |
| 9 | Hook que hace tres cosas | Tres hooks y un facade |
| 10 | Componente shadcn modificado sin registrar por qué | Se copia al repo: documentar el cambio |
| 11 | Fuente o script desde CDN externo | Autoalojado |
| 12 | Animación decorativa en pantalla operativa | Sin animación |
| 13 | Emoji usado como icono de interfaz | Phosphor |
| 14 | Icono de Lucide sobreviviendo en un componente shadcn copiado | Reemplazar por su equivalente Phosphor |
| 15 | Pesos de Phosphor mezclados sin criterio | `regular`, y `fill` solo para estado activo |
| 16 | Acción destructiva representada solo con icono | Icono más texto |
