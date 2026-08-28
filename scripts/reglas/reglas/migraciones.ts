import { escapar, esSql, lineaDe } from "../comunes";
import type { Archivo, Regla } from "../tipos";

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

/**
 * Las cuatro piezas, verificadas por CONTENIDO y no por presencia.
 *
 * La version anterior solo preguntaba si existia una politica que nombrara la
 * tabla y un GRANT que la nombrara. Con eso, `CREATE POLICY ... USING (true)`
 * pasaba en verde: una politica que no filtra por nada, sobre una tabla con
 * `ayuntamiento_id`. Y un `GRANT ... TO "xula_super_admin"` sin el rol de
 * aplicacion tambien pasaba.
 *
 * El fixture del propio test lo delataba: construia el caso "correcto" con
 * `USING (true)`. O sea que la reja estaba disenada para aprobar exactamente
 * lo que existe para impedir. En cualquier otra regla la parcialidad se
 * discute; en esta no, porque es la garantia de aislamiento entre municipios.
 *
 * Alcanza con que UNA politica filtre por tenant: una tabla puede tener
 * ademas la del super admin, con otro predicado y a proposito.
 */
const piezasDeRls = (contenido: string, tabla: string): string[] => {
  const n = escapar(tabla);
  const faltantes: string[] = [];

  if (
    !new RegExp(`ALTER TABLE\\s+"${n}"\\s+ENABLE ROW LEVEL SECURITY`).test(
      contenido,
    )
  ) {
    faltantes.push("ENABLE ROW LEVEL SECURITY");
  }

  if (
    !new RegExp(`ALTER TABLE\\s+"${n}"\\s+FORCE ROW LEVEL SECURITY`).test(
      contenido,
    )
  ) {
    faltantes.push("FORCE ROW LEVEL SECURITY");
  }

  const politicas = sentenciasSobre(contenido, /CREATE POLICY/i, tabla);

  if (politicas.length === 0) {
    faltantes.push("CREATE POLICY");
  } else if (
    !politicas.some((politica) => /ayuntamiento_id|app\.tenant/i.test(politica))
  ) {
    faltantes.push("una CREATE POLICY que filtre por el tenant");
  }

  const permisos = sentenciasSobre(contenido, /GRANT/i, tabla);

  if (permisos.length === 0) {
    faltantes.push("GRANT");
  } else if (!permisos.some((permiso) => /TO\s+"xula_app"/i.test(permiso))) {
    faltantes.push('un GRANT al rol de aplicacion (TO "xula_app")');
  }

  return faltantes;
};

/**
 * `IF NOT EXISTS` es opcional en el patron a proposito.
 *
 * drizzle-kit 0.31.10 —el instalado— emite `CREATE TABLE ${name} (` pelado:
 * se verifico buscando la cadena en el paquete entero, y solo aparece en su
 * README. O sea que hoy la alternancia no matchea nada.
 *
 * Esta igual porque el modo de falla es silencioso. Si un bump la agrega, o
 * si alguien escribe la migracion a mano con esa forma, sin la alternancia
 * el `CREATE TABLE` no matchea y la regla sale en verde sin revisar esa
 * tabla. Es el mismo defecto —una reja que no revisa una linea— que este
 * repositorio ya pago dos veces. Una alternancia cuesta nada; enterarse
 * tarde cuesta un municipio leyendo los datos de otro.
 */
const tablasDeMunicipio = (archivo: Archivo) =>
  [
    ...archivo.contenido.matchAll(
      /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?"([^"]+)"\s*\(([\s\S]*?)\n\);/gi,
    ),
  ]
    .map((tabla) => ({
      nombre: tabla[1] ?? "",
      cuerpo: tabla[2] ?? "",
      indice: tabla.index,
    }))
    .filter(
      (tabla) => tabla.nombre !== "" && /"ayuntamiento_id"/.test(tabla.cuerpo),
    );

/**
 * Las cuatro cosas que hace toda migracion que crea una tabla de municipio.
 *
 * La que mas importa es `FORCE`: drizzle-kit genera `ENABLE` solo, nunca
 * `FORCE`, asi que la diferencia entre una tabla aislada y una que el rol
 * dueno lee entera se agrega a mano despues de cada `db:generate`. Es
 * exactamente el tipo de paso que se olvida.
 *
 * El predicado es la columna, no la tabla: un catalogo de plataforma
 * —`abreviaturas`— no lleva `ayuntamiento_id` porque no pertenece a ningun
 * municipio, y exigirle RLS seria pedirle que filtre contra nada.
 */
export const rlsEnTablaNueva: Regla = {
  id: "rls-tabla-nueva",
  antipatron: 5,
  titulo: "Tabla con ayuntamiento_id sin RLS completo",
  revisar(archivos) {
    return archivos
      .filter((archivo) => esSql(archivo.ruta))
      .flatMap((archivo) =>
        tablasDeMunicipio(archivo)
          .map((tabla) => ({
            tabla,
            faltantes: piezasDeRls(archivo.contenido, tabla.nombre),
          }))
          .filter(({ faltantes }) => faltantes.length > 0)
          .map(({ tabla, faltantes }) => ({
            ruta: archivo.ruta,
            linea: lineaDe(archivo.contenido, tabla.indice),
            mensaje: `La tabla \`${tabla.nombre}\` lleva \`ayuntamiento_id\` y le falta, en este mismo archivo: ${faltantes.join(", ")}.`,
          })),
      );
  },
};

/**
 * Una secuencia es global a la base. Dos municipios compartiendola dejan
 * huecos en el consecutivo de cada uno, y el folio de una constancia es un
 * numero que la gente lee y reclama.
 */
export const secuenciaParaFolios: Regla = {
  id: "folio-secuencia",
  antipatron: 9,
  titulo: "Secuencia de base de datos para folios",
  revisar(archivos) {
    const hallazgos = [];

    for (const archivo of archivos) {
      if (!esSql(archivo.ruta)) continue;

      for (const encontrado of archivo.contenido.matchAll(
        /CREATE SEQUENCE/gi,
      )) {
        hallazgos.push({
          ruta: archivo.ruta,
          linea: lineaDe(archivo.contenido, encontrado.index),
          mensaje:
            "Secuencia global. El folio va por contador del municipio con lock en transaccion.",
        });
      }
    }

    return hallazgos;
  },
};
