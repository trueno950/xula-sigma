/**
 * Reduce un error a lo que se puede registrar sin filtrar datos de nadie.
 *
 * Un error de Postgres lleva los **valores de la fila** en su texto:
 * `duplicate key value violates unique constraint ... Key (email)=(...)`.
 * Drizzle ademas agrega `params: [...]` al mensaje que envuelve. Un log no
 * tiene RLS ni bitacora de acceso, asi que un correo ahi queda expuesto
 * para siempre y sin registro de quien lo leyo.
 *
 * **Lista blanca, no lista negra.** Se eligen los campos a conservar en vez
 * de tachar los peligrosos: una lista negra no cubre el campo que la
 * proxima version de la libreria agregue, y ese es justo el que se filtra
 * sin que nadie lo note. Todo lo que no este nombrado aca no sale.
 *
 * El nombre de tabla, columna y restriccion SI se conservan. Al cliente no
 * se le dicen nunca —eso es filtracion de esquema, ver `route.ts`— pero en
 * el log del servidor son lo unico que permite arreglar el problema, y no
 * identifican a ninguna persona.
 */
const CAMPOS_SEGUROS = [
  "code",
  "severity",
  "constraint_name",
  "table_name",
  "column_name",
  "schema_name",
  "routine",
] as const;

export type ErrorRegistrable = {
  campos: Record<string, unknown>;
  traza: string | undefined;
};

/**
 * Solo los marcos (`    at ...`), no "todo menos la primera linea".
 *
 * El mensaje de Postgres es multilinea —el `Key (email)=(...)` va en la
 * segunda— asi que saltar una sola linea dejaba pasar el correo.
 * Verificado: el test lo agarro antes de que esto llegara a un log.
 */
function marcosDe(stack: unknown): string | undefined {
  if (typeof stack !== "string") return undefined;

  const marcos = stack.split("\n").filter((linea) => /^\s+at\s/.test(linea));

  return marcos.length > 0 ? marcos.join("\n") : undefined;
}

/**
 * Recorre la cadena de `cause`: drizzle envuelve el error de Postgres y los
 * campos utiles viven en el de adentro. El `Set` corta las cadenas
 * circulares.
 */
function* cadenaDeCausas(error: unknown): Generator<Record<string, unknown>> {
  let actual: unknown = error;
  const vistos = new Set<unknown>();

  while (actual && typeof actual === "object" && !vistos.has(actual)) {
    vistos.add(actual);
    const registro = actual as Record<string, unknown>;
    yield registro;
    actual = registro.cause;
  }
}

/**
 * `name` va al reves que los demas campos: gana el de ADENTRO.
 *
 * Esta en `Error.prototype`, asi que el envoltorio de drizzle —un `Error`
 * pelado— responde `"Error"` sin que nadie se lo haya puesto. Con la regla
 * del primero, ese generico le ganaba al `PostgresError` de adentro y el
 * log perdia la senial de que el fallo fue de base, que es lo primero que
 * se busca. Los demas campos solo existen en el error de Postgres, asi que
 * ahi el primero que aparece ya es el correcto.
 */
const nombreMasEspecifico = (
  campos: Record<string, unknown>,
  valor: unknown,
) => (typeof valor === "string" ? valor : campos.name);

export function datosSegurosDeError(error: unknown): ErrorRegistrable {
  const campos: Record<string, unknown> = {};
  let traza: string | undefined;

  for (const registro of cadenaDeCausas(error)) {
    for (const campo of CAMPOS_SEGUROS) {
      campos[campo] ??= registro[campo];
    }

    campos.name = nombreMasEspecifico(campos, registro.name);

    // La del error mas externo: es la que dice por donde paso la peticion.
    traza ??= marcosDe(registro.stack);
  }

  for (const campo of CAMPOS_SEGUROS) {
    if (campos[campo] === undefined) delete campos[campo];
  }

  campos.name ??= error instanceof Error ? error.name : typeof error;

  return { campos, traza };
}
