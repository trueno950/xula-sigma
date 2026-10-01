/**
 * La violacion de restriccion unica llega con SQLSTATE `23505` y el nombre
 * de la restriccion en `constraint_name`; `shared/lib/registroDeError.ts`
 * documenta por que hay que buscar el error de Postgres en la cadena de
 * `cause`.
 */
export const violaRestriccionUnica = (
  error: unknown,
  restriccion: string,
): boolean => {
  let actual: unknown = error;
  const vistos = new Set<unknown>();

  while (actual && typeof actual === "object" && !vistos.has(actual)) {
    vistos.add(actual);
    const campos = actual as Record<string, unknown>;
    if (campos.code === "23505" && campos.constraint_name === restriccion) {
      return true;
    }
    actual = campos.cause;
  }

  return false;
};
