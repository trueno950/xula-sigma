import { escapar, esSql, lineaDe } from "../comunes";
import type { Archivo, Regla } from "../tipos";

const piezasDeRls = (contenido: string, tabla: string): string[] => {
  const n = escapar(tabla);

  return [
    {
      que: "ENABLE ROW LEVEL SECURITY",
      patron: new RegExp(`ALTER TABLE\\s+"${n}"\\s+ENABLE ROW LEVEL SECURITY`),
    },
    {
      que: "FORCE ROW LEVEL SECURITY",
      patron: new RegExp(`ALTER TABLE\\s+"${n}"\\s+FORCE ROW LEVEL SECURITY`),
    },
    {
      que: "CREATE POLICY",
      patron: new RegExp(`CREATE POLICY[^;]*?\\bON\\s+"${n}"`),
    },
    { que: "GRANT", patron: new RegExp(`GRANT[^;]*?\\bON\\s+"${n}"`) },
  ]
    .filter(({ patron }) => !patron.test(contenido))
    .map(({ que }) => que);
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
