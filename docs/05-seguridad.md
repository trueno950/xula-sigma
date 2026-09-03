# 05 — Seguridad y Datos Personales

Reglas infranqueables. Cada una tiene detrás un modo de falla concreto.

---

## 1. Aislamiento entre ayuntamientos

Es la regla de seguridad número uno del proyecto. Está desarrollada en
`architecture/invariantes-criticos.md`; acá va lo mínimo indispensable.

```ts
// ❌ el cliente decide de qué municipio son los datos
export async function listarConstancias(ayuntamientoId: string) { ... }

// ✅ el servidor lo resuelve
export async function listarConstancias() {
  const { ayuntamientoId } = await getTenantContext();
}
```

Tres capas, todas obligatorias:

1. Contexto resuelto en servidor desde el subdominio o la sesión
2. `SET LOCAL app.tenant` dentro de transacción
3. RLS con `FORCE ROW LEVEL SECURITY` en Postgres

El rol de aplicación no es owner de las tablas y no tiene `BYPASSRLS`. Si
lo fuera, RLS no haría absolutamente nada y todo se vería igual de bien en
desarrollo.

---

## 2. Contraseñas

```ts
// ❌ nunca
await db.insert(usuarios).values({ password });
const hash = md5(password);

// ✅ argon2id, o bcrypt con cost ≥ 12
import { hash, verify } from "@node-rs/argon2";

export async function hashPassword(password: string): Promise<string> {
  return hash(password);
}

export async function verifyPassword(password: string, digest: string) {
  return verify(digest, password);
}
```

Requisito mínimo: 12 caracteres. Sin exigencia de símbolos raros — una
regla que obliga a `Password1!` produce peores contraseñas que una que
exige longitud.

El personal de un ayuntamiento no es experto en tecnología. Se prioriza
longitud y frases sobre complejidad ornamental.

---

## 3. IDs y exposición

### UUID hacia afuera

```text
❌ GET /constancias/1        adivinable, y revela volumen
✅ GET /constancias/550e8400-e29b-41d4-a716-446655440000
```

Un ID secuencial expuesto también le dice a un tercero cuántas constancias
emitió el municipio, lo cual no es información suya.

### 404, no 403

```ts
// ❌ confirma que el recurso existe en otro municipio
if (recurso.ayuntamientoId !== tenantId) throw new ForbiddenError();

// ✅
const recurso = await repo.buscarPorId(id); // RLS ya lo filtró
if (!recurso) notFound();
```

---

## 4. Validación de entrada

Todo dato que entra al sistema se valida con Zod **en el borde**, antes de
tocar un caso de uso.

```ts
// ❌
export async function registrarPersona(input: unknown) {
  return repo.guardar(input as Persona);
}

// ✅
const RegistrarPersonaSchema = z.object({
  nombre: z.string().min(1).max(150),
  curp: z.string().length(18).optional(),
  domicilioId: z.string().uuid(),
});

export async function registrarPersona(input: unknown) {
  const datos = RegistrarPersonaSchema.parse(input);
  return repo.guardar(Persona.crear(datos));
}
```

La validación no reemplaza a las reglas de dominio. Zod verifica forma; el
dominio verifica sentido.

---

## 5. Datos personales

El ayuntamiento es sujeto obligado en materia de protección de datos.
Nosotros somos encargados del tratamiento. Esa obligación existe sin
importar cómo se llame el módulo.

### Categorías cerradas, nunca texto libre

```ts
// ❌ acá alguien escribe un diagnóstico
type ApoyoTraslado = { motivo: string };

// ✅
type MotivoTraslado = "salud" | "educacion" | "tramite" | "defuncion" | "otro";
```

Aplica a:

- motivo de apoyo de traslado (revela condición de salud)
- tipo de asunto del juzgado (revela conflicto legal o familiar)
- tipo de apoyo social (revela situación socioeconómica)

### Minimización

No se guarda lo que no se necesita para operar. En concreto:

- del juzgado: partes, fecha, tipo, resultado como categoría, y el escaneo
  del acta. **Sin expediente narrado.**
- de traslados: destino y categoría. **Sin detalle clínico.**
- de apoyos: programa, monto y fecha. Sin evaluación socioeconómica en
  texto libre.

### Bitácora

- Acceso al padrón de apoyos: bitácora a nivel registro, no a nivel sesión
- Exportación masiva: autorizada por rol, registrada con usuario, momento,
  alcance y cantidad
- La bitácora es de solo agregado; la aplicación no la actualiza ni la
  borra

### Riesgo político

Un padrón de apoyos es una herramienta electoral potencial. En caso de
denuncia por uso electoral, esta base de datos es la evidencia. El diseño
lo asume: sin exportación silenciosa, sin acceso sin traza.

---

## 6. Autorización

Roles: `SUPER_ADMIN`, `ADMIN_MUNICIPAL`, `OPERADOR`, `CONSULTA`.

```ts
// ❌ asumir que si llegó, puede
export async function exportarPadron() {
  return repo.exportarTodo();
}

// ✅ verificar en el caso de uso, no solo en la UI
export async function exportarPadron() {
  const { usuario, ayuntamientoId } = await getTenantContext();
  if (usuario.rol !== "ADMIN_MUNICIPAL") throw new NoAutorizadoError();

  await bitacora.registrar({
    accion: "exportar_padron",
    usuario: usuario.id,
    ayuntamientoId,
  });

  return repo.exportarTodo();
}
```

Ocultar un botón en la UI no es autorización. Es cosmética.

### SuperAdmin

El rol `SUPER_ADMIN` puede cambiar de ayuntamiento. Reglas:

- Cada cambio de contexto queda en bitácora
- El contexto anterior no persiste en ninguna capa (servidor, caché,
  cliente)
- No puede leer datos de apoyos ni del juzgado sin dejar traza explícita

---

## 7. SQL

Drizzle parametriza por defecto. El riesgo aparece con SQL crudo.

```ts
// ✅ sql`` template parametriza
await tx.execute(sql`SET LOCAL app.tenant = ${tenantId}`);

// ❌ concatenación
await tx.execute(sql.raw(`SET LOCAL app.tenant = '${tenantId}'`));
```

`sql.raw` con datos de entrada está prohibido.

---

## 8. Secretos

```ts
// ❌
const dbUrl = "postgresql://user:pass@host/db";

// ✅
const env = EnvSchema.parse(process.env);
```

- `.env.example` se commitea; `.env` nunca
- Las variables se validan con Zod al arrancar. Si falta una, la app no
  levanta — mejor eso que descubrirlo en producción a las dos de la tarde.

```ts
const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  APP_DB_USER: z.string(),
  MIGRATION_DB_USER: z.string(),
  SESSION_SECRET: z.string().min(32),
  R2_BUCKET: z.string(),
});
```

Nótese que hay dos usuarios de base de datos. No es opcional: el de
migraciones es owner, el de aplicación no, y esa separación es lo que hace
que RLS sirva de algo.

---

## 9. Assets

- Escudos y logotipos van a object storage. Nunca al filesystem del
  contenedor — es efímero.
- Un asset de un ayuntamiento no es accesible desde el espacio de otro
- Se valida tipo y tamaño en el servidor, no solo en el cliente
- El escudo municipal es oficial y su uso está normado en el bando. Lo sube
  el ayuntamiento; no se descarga de internet.

---

## 10. Rate limiting

Obligatorio en:

- login
- validación pública de folio de constancia
- consulta pública de folio de reporte ciudadano

Las tres son superficies públicas y las tres se pueden usar para enumerar
datos.

Las dos últimas superficies de folio comparten la misma ventana `"folio"` de
`TipoIntento`: la clave se deriva del origen del request (la IP), no del
folio consultado, así que un origen que valida constancias y consulta
reportes cuenta contra la misma cuota. Sin valor nuevo en el `CHECK` ni
migración — es la decisión del usuario (`reportes-ciudadanos`), y la
consecuencia es observable desde afuera: un origen puede agotar la ventana
combinando las dos consultas.
