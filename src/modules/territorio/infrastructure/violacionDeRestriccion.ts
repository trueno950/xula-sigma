/**
 * `postgres.js` (el driver, `shared/tenancy/withTenant.ts`) marca la
 * violacion de restriccion unica con SQLSTATE `23505` y expone el nombre de
 * la restriccion en `constraint_name` -mismo campo que ya lista
 * `registroDeError.ts` como seguro para loguear-, pero drizzle envuelve ese
 * error de Postgres: los campos viven en `.cause`, no en el error que
 * llega al repositorio (mismo hallazgo que documenta `registroDeError.ts`).
 * Por eso se recorre la cadena de `cause` en vez de mirar solo el primero.
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
