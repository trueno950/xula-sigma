# Invariantes Críticos

Guía operativa para los contratos que no pueden romperse. Si algo de este
documento falla en producción, el daño no se repara con un parche.

## Objetivo

Tener los tests en verde no alcanza. En una plataforma multi-tenant que
guarda padrones de apoyos sociales y registros de un juzgado, el modo de
falla grave no es un bug visible: es que los datos de un municipio se vean
desde otro y nadie se entere.

Este documento define:

- los invariantes que nadie rompe
- los escenarios críticos que se revisan siempre
- la estrategia de validación que detecta la falla real, no solo el
  síntoma

---

## Invariantes Obligatorios

### 1. Aislamiento entre ayuntamientos

Este es el invariante raíz. Todo lo demás es secundario.

- El `ayuntamiento_id` efectivo **siempre** viene del contexto de sesión
  resuelto en el servidor. Nunca del body, del query string, ni de un
  parámetro que el cliente controle.
- Toda tabla operativa tiene columna `ayuntamiento_id` y política RLS con
  `FORCE ROW LEVEL SECURITY`.
- El rol de aplicación no es owner de las tablas y no tiene `BYPASSRLS`.
  Migraciones y aplicación usan roles distintos.
- **Y la aplicación se conecta con ese rol, no solo lo tiene definido.**
  Son dos cosas distintas y la segunda no la prueba un test: un test corre
  contra la base de pruebas, y `DATABASE_URL` apuntando al superusuario
  deja la suite entera en verde con RLS apagado. Por eso `withTenant`
  verifica `current_user` una vez por proceso y se niega a servir si tiene
  `SUPERUSER` o `BYPASSRLS`. Ver `shared/tenancy/rolDeAplicacion.ts`.
- Todo acceso a base de datos pasa por el helper de `shared/tenancy`. No
  existe una ruta alternativa a la conexión.
- El tenant se fija con `SET LOCAL` dentro de transacción. Nunca `SET`
  suelto.
- Una consulta escrita sin filtro explícito de tenant debe devolver
  únicamente filas del tenant activo. Si devuelve más, el aislamiento está
  roto aunque la consulta "funcione".
- Un recurso de otro ayuntamiento accedido por ID directo responde **404,
  no 403**. Un 403 confirma que el recurso existe.

### 2. Folios y documentos oficiales

- El folio es **consecutivo por ayuntamiento**, no global. Dos municipios
  distintos generan la serie de folios de forma independiente.
- El folio se asigna dentro de la misma transacción que inserta el
  documento, con lock sobre el contador del tenant. No se usa una secuencia
  de base de datos: una secuencia deja huecos al hacer rollback, y un hueco
  en una serie de documentos oficiales es una pregunta que nadie quiere
  responder en una auditoría.
- Un documento emitido no se modifica. Se cancela y se emite uno nuevo.
- Toda reimpresión queda registrada con usuario, momento y motivo. El
  contador de reimpresiones nunca decrece.
- La validación pública por QR confirma validez y datos mínimos. **Nunca
  expone el registro completo ni datos de terceros.**

### 3. Datos personales

- El motivo de un traslado y el tipo de asunto del juzgado son **categorías
  cerradas**. Nunca texto libre. Un diagnóstico o un pleito familiar
  escrito en un campo abierto es dato sensible almacenado sin protección,
  sin importar cómo se llame el módulo.
- El módulo del juzgado es índice y respaldo. No calcula plazos, no
  registra detenciones, no guarda expediente narrado.
- Toda exportación masiva queda en bitácora con usuario, momento, alcance y
  cantidad de registros.
- La bitácora de acceso al padrón de apoyos es a nivel registro, no a nivel
  sesión.
- Un borrado de persona no borra su historial de auditoría.

### 4. Marca blanca y assets

- Los escudos y logotipos viven en almacenamiento de objetos. **Nunca en el
  filesystem del contenedor** — es efímero y desaparece en el siguiente
  despliegue.
- Un asset subido por un ayuntamiento no es accesible desde el espacio de
  otro.
- Los colores se resuelven en servidor y se inyectan antes de enviar el
  HTML. No hay estado intermedio donde el usuario vea la marca por defecto.

### 5. Auditoría

- Toda operación que crea, modifica o cancela un registro operativo deja
  traza con usuario, ayuntamiento, momento y acción.
- La bitácora es de solo agregado. No se actualiza ni se borra desde la
  aplicación.
- Una traza sin `ayuntamiento_id` es una traza inválida.

---

## Matriz de Escenarios Críticos

| ID | Escenario | Capas | Esperado |
| --- | --- | --- | --- |
| T1 | Consulta sin filtro explícito de tenant | repositorio, RLS | Devuelve solo filas del tenant activo |
| T2 | Request de A y luego de B reusando conexión del pooler | tenancy, pooler, RLS | Sin filtración; `SET LOCAL` murió con la transacción anterior |
| T3 | Usuario de A pide por ID un recurso de B | ruta, caso de uso, RLS | 404 sin revelar existencia, sin efectos |
| T4 | Tabla nueva sin política RLS | migración, test de esquema | El build falla |
| T5 | Migración ejecutada con el rol de aplicación | pipeline | Rechazo explícito; roles separados |
| T6 | Dos constancias emitidas en paralelo en el mismo municipio | contador, transacción | Folios distintos y consecutivos, sin huecos |
| T7 | Rollback de emisión después de tomar folio | transacción | El folio no se consume |
| T8 | Validación pública de folio por QR | portal público | Confirma validez sin exponer datos de terceros |
| T9 | SuperAdmin cambia de ayuntamiento en la misma sesión | contexto, caché | El contexto anterior no persiste en ninguna capa |
| T10 | Subida de escudo municipal | assets | Va a object storage; sobrevive al redeploy |
| T11 | Exportación masiva del padrón de apoyos | autorización, bitácora | Autorizada por rol y registrada con alcance |
| T12 | Cancelación de documento ya emitido | dominio | Se cancela y se registra; el original no se modifica |

**T10** dejó de estar sin test: `src/modules/marca/escudo.isolation.test.ts`
prueba que el `ADMIN_MUNICIPAL` de un ayuntamiento no cambia la marca de
otro, y que RLS corta aunque el `ayuntamientoId` se falsee. El almacenamiento
fuera del filesystem del contenedor lo cubre el adaptador de R2
(`src/modules/marca/infrastructure/almacenR2.ts`) detrás del puerto
`AlmacenDeAssets`.

---

## Estrategia de Validación

### Capa 1: Tests unitarios

Reglas aisladas, sin IO.

- validaciones de dominio
- formato y composición de folio
- resolución de categorías cerradas
- reglas de autorización por rol

### Capa 2: Tests de aislamiento

**Obligatorios. Uno por cada tabla con `ayuntamiento_id`.**

Forma canónica del test:

1. Crear dos tenants
2. Insertar datos en ambos
3. Fijar contexto en el tenant A
4. Ejecutar una consulta **deliberadamente sin filtro**
5. Verificar que devuelve únicamente filas de A
6. Intentar leer un ID conocido de B y verificar que no aparece

Además existe un test de esquema que recorre la base y falla si encuentra
una tabla con `ayuntamiento_id` sin política RLS activa. Agregar una tabla
y olvidar el aislamiento rompe el build.

### Capa 3: Tests de integración

Repositorios contra Postgres real, con transacciones reales.

- comportamiento del contador de folios bajo concurrencia
- que el rollback no consuma folio
- que `SET LOCAL` no sobreviva a la transacción

### Capa 4: E2E de aislamiento

Con navegador y sesiones reales:

- iniciar sesión en dos municipios en paralelo
- confirmar que ninguna vista, búsqueda o exportación cruza datos
- confirmar que el cambio de tenant limpia todo estado de cliente

### Capa 5: Observabilidad

Los tests prueban lo que se anticipó. En producción hace falta detectar lo
que no:

- conteo de registros por ayuntamiento, para detectar crecimiento anómalo
- alerta ante cualquier consulta que ejecute con contexto de tenant vacío
- revisión periódica de la bitácora de exportaciones masivas
- verificación de que el esquema en producción tiene RLS en todas las
  tablas esperadas

---

## Checklist para PRs Críticos

Todo PR que toque tenancy, folios, datos personales o auditoría responde:

- ¿Qué invariantes toca?
- ¿Agrega una tabla? ¿Tiene RLS y su test de aislamiento en este mismo
  commit?
- ¿Abre conexión a base de datos? ¿Pasa por el helper de tenancy?
- ¿Usa `SET LOCAL` dentro de transacción?
- ¿Qué pasa si dos requests de municipios distintos caen en la misma
  conexión del pooler?
- ¿Qué pasa si la transacción hace rollback después de tomar folio?
- ¿Expone algún dato en una superficie pública? ¿Qué ve un tercero?
- ¿Agrega un campo de texto libre donde podría escribirse dato sensible?

---

## Cómo se lee este documento

Si estás por escribir código que toca base de datos, leé la sección 1.

Si estás por agregar una tabla, leé la sección 1 y la Capa 2 de validación.

Si estás por exponer algo al público, leé las secciones 2 y 3.

El resto se consulta cuando el PR lo toca.
