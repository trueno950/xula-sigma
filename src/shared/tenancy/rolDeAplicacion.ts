/**
 * Con que rol se conecta la aplicacion.
 *
 * `esquema.isolation.test.ts` ya afirma que ningun rol `xula_*` tiene
 * `SUPERUSER` ni `BYPASSRLS`. Eso prueba que el rol correcto existe y es
 * inofensivo — no prueba que sea el que se esta usando. Si `DATABASE_URL`
 * apunta al superusuario, esos tests siguen en verde, RLS deja de filtrar
 * y no falla nada: todo anda bien hasta el segundo municipio.
 *
 * Es el modo de falla que el roadmap llama "el mas peligroso del proyecto
 * porque es silencioso", por una puerta que el roadmap no nombra: no la
 * definicion del rol, sino la cadena de conexion.
 *
 * Por eso la afirmacion vive en el arranque y no en un test. Un test corre
 * contra la base de pruebas; esto corre contra la base a la que la
 * aplicacion se conecta de verdad.
 */

export type FilaDeRol = {
  usuario: string;
  rolsuper: boolean;
  rolbypassrls: boolean;
};

/** El motivo por el que este rol no sirve, o `null` si sirve. */
export function problemaDeRol(fila: FilaDeRol | undefined): string | null {
  // `pg_roles` siempre trae la fila de `current_user`. Que no venga
  // significa que la consulta no es la que se cree. No saber no es lo
  // mismo que estar bien.
  if (!fila) {
    return "no se pudo verificar el rol de la conexion: pg_roles no devolvio la fila de current_user.";
  }

  const atributos = [
    fila.rolsuper ? "SUPERUSER" : null,
    fila.rolbypassrls ? "BYPASSRLS" : null,
  ].filter((atributo) => atributo !== null);

  if (atributos.length === 0) return null;

  return (
    `la aplicacion se conecta como "${fila.usuario}", que tiene ` +
    `${atributos.join(" y ")}. Con cualquiera de los dos, RLS no filtra ` +
    "nada y los municipios dejan de estar aislados sin que falle nada. " +
    "DATABASE_URL tiene que ser la del rol de aplicacion. Ver " +
    "scripts/bootstrap.sql."
  );
}
