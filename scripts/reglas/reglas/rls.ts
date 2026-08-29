import { escapar } from "../comunes";

/**
 * Las tablas que pueden entrar sin `ayuntamiento_id`, y por que cada una.
 *
 * La lista existe porque el predicado no puede deducirse del archivo: una
 * tabla sin la columna es un catalogo de plataforma legitimo o es una fuga,
 * y el SQL se ve igual en los dos casos. AGENTS.md ya fija el mecanismo para
 * los catalogos —"una segunda no entra sin agregarse a esta lista"— por la
 * misma razon que la lista de salidas con driver de la regla 2: una
 * excepcion que vive fuera de las reglas es indistinguible de un olvido.
 *
 * `ayuntamientos` no es un catalogo y no esta en aquella lista: es la raiz
 * del tenant, su propio `id` ES el municipio y su politica filtra por esa
 * columna. Se nombra aca para que la regla no le pida una columna que seria
 * una referencia a si misma.
 */
const EXENTAS = new Map<string, "catalogo" | "raiz">([
  ["abreviaturas", "catalogo"],
  ["ayuntamientos", "raiz"],
]);

/** Las sentencias de un tipo que hablan de una tabla, ya separadas por `;`. */
const sentenciasSobre = (
  contenido: string,
  arranque: RegExp,
  tabla: string,
): string[] =>
  contenido
    .split(";")
    .filter(
      (sentencia) =>
        arranque.test(sentencia) &&
        new RegExp(`\\bON\\s+"${escapar(tabla)}"`).test(sentencia),
    );

const activaciones = (contenido: string, tabla: string): string[] => {
  const n = escapar(tabla);

  return ["ENABLE", "FORCE"]
    .filter(
      (pieza) =>
        !new RegExp(
          `ALTER TABLE\\s+"${n}"\\s+${pieza} ROW LEVEL SECURITY`,
        ).test(contenido),
    )
    .map((pieza) => `${pieza} ROW LEVEL SECURITY`);
};

/**
 * Nombrar `ayuntamiento_id` no es filtrar por el.
 *
 * La version anterior pedia que alguna politica mencionara el token, y con
 * eso `USING (ayuntamiento_id IS NOT NULL)` pasaba en verde dejando ver las
 * filas de todos los municipios. Lo que se exige es la comparacion contra
 * `app.tenant`, que es la unica forma en que este repositorio la escribe
 * —las treinta politicas de `drizzle/` usan `current_setting('app.tenant',
 * true)`—. Alcanza con que UNA la tenga: una tabla puede llevar ademas la
 * del super admin, con otro predicado y a proposito.
 */
const politica = (contenido: string, tabla: string): string[] => {
  const politicas = sentenciasSobre(contenido, /CREATE POLICY/i, tabla);

  if (politicas.length === 0) return ["CREATE POLICY"];

  return politicas.some((una) =>
    /current_setting\s*\(\s*['"]app\.tenant['"]/i.test(una),
  )
    ? []
    : ["una CREATE POLICY que filtre por el tenant"];
};

const permiso = (contenido: string, tabla: string): string[] => {
  const permisos = sentenciasSobre(contenido, /GRANT/i, tabla);

  if (permisos.length === 0) return ["GRANT"];

  return permisos.some((uno) => /TO\s+"xula_app"/i.test(uno))
    ? []
    : ['un GRANT al rol de aplicacion (TO "xula_app")'];
};

/**
 * Las cuatro piezas, verificadas por CONTENIDO y no por presencia.
 *
 * La primera version solo preguntaba si existia una politica que nombrara la
 * tabla y un GRANT que la nombrara. Con eso `CREATE POLICY ... USING (true)`
 * pasaba en verde, y el fixture del propio test construia el caso "correcto"
 * con `USING (true)`: la reja estaba disenada para aprobar exactamente lo que
 * existe para impedir. En cualquier otra regla la parcialidad se discute; en
 * esta no, porque es la garantia de aislamiento entre municipios.
 */
export const piezasDeRls = (contenido: string, tabla: string): string[] => [
  ...activaciones(contenido, tabla),
  ...politica(contenido, tabla),
  ...permiso(contenido, tabla),
];

/**
 * A un catalogo exento no lo protege una politica sino el `GRANT`.
 *
 * AGENTS.md lo dice en la misma seccion que concede la excepcion: `SELECT`
 * para el rol de aplicacion y nunca `INSERT` ni `UPDATE`, porque el catalogo
 * se cura a mano. Sin esta pieza la exencion seria el agujero que esa
 * seccion existe para cerrar.
 */
export const escrituraEnCatalogo = (
  contenido: string,
  tabla: string,
): boolean =>
  sentenciasSobre(contenido, /GRANT/i, tabla).some(
    (uno) =>
      /TO\s+"xula_app"/i.test(uno) &&
      /\b(INSERT|UPDATE|DELETE|TRUNCATE|ALL)\b/i.test(uno),
  );

export const exencionDe = (tabla: string) => EXENTAS.get(tabla);
