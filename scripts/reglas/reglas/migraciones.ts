import { esSql, lineaDe, sinComentarios } from "../comunes";
import type { Archivo, Regla } from "../tipos";
import { escrituraEnCatalogo, exencionDe, piezasDeRls } from "./rls";

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
const tablasDeclaradas = (archivo: Archivo) =>
  [
    ...archivo.contenido.matchAll(
      /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?"([^"]+)"\s*\(([\s\S]*?)\n\);/gi,
    ),
  ]
    .map((tabla) => ({
      nombre: tabla[1] ?? "",
      conTenant: /"ayuntamiento_id"/.test(tabla[2] ?? ""),
      indice: tabla.index,
    }))
    .filter((tabla) => tabla.nombre !== "");

/**
 * Las cuatro cosas que hace toda migracion que crea una tabla de municipio,
 * mas la que las precede: que la tabla lleve `ayuntamiento_id`.
 *
 * La que mas importa de las cuatro es `FORCE`: drizzle-kit genera `ENABLE`
 * solo, nunca `FORCE`, asi que la diferencia entre una tabla aislada y una
 * que el rol dueno lee entera se agrega a mano despues de cada
 * `db:generate`. Es exactamente el tipo de paso que se olvida.
 *
 * La quinta se agrego despues, y por un defecto de esta misma regla: el
 * filtro de tablas era `/"ayuntamiento_id"/`, o sea que solo revisaba las
 * que YA tenian la columna. Una tabla de municipio sin ella salia por el
 * mismo lado que un catalogo de plataforma —sin revisar, en verde—, que es
 * la fuga mas grave de las cinco y la unica que ninguna otra regla
 * compensaba. Ahora el default es exigir, y las excepciones se nombran.
 */
const revisarTabla = (
  sql: string,
  tabla: { nombre: string; conTenant: boolean },
): string[] => {
  const exencion = exencionDe(tabla.nombre);

  if (exencion === "raiz") return [];

  if (exencion === "catalogo") {
    return escrituraEnCatalogo(sql, tabla.nombre)
      ? [
          "es un catalogo de plataforma con permiso de escritura para `xula_app`: va `SELECT` y nada mas, porque se cura a mano",
        ]
      : [];
  }

  if (!tabla.conTenant) {
    return [
      "no lleva `ayuntamiento_id` y no esta en la lista de excepciones: si no guarda dato de ningun municipio, entra a esa lista antes que a la migracion",
    ];
  }

  const faltantes = piezasDeRls(sql, tabla.nombre);

  return faltantes.length === 0
    ? []
    : [
        `lleva \`ayuntamiento_id\` y le falta, en este mismo archivo: ${faltantes.join(", ")}`,
      ];
};

export const rlsEnTablaNueva: Regla = {
  id: "rls-tabla-nueva",
  antipatron: 5,
  titulo: "Tabla nueva sin ayuntamiento_id o sin RLS completo",
  revisar(archivos) {
    return archivos
      .filter((archivo) => esSql(archivo.ruta))
      .map((archivo) => ({
        ...archivo,
        contenido: sinComentarios(archivo.contenido),
      }))
      .flatMap((archivo) =>
        tablasDeclaradas(archivo)
          .map((tabla) => ({
            tabla,
            fallas: revisarTabla(archivo.contenido, tabla),
          }))
          .filter(({ fallas }) => fallas.length > 0)
          .map(({ tabla, fallas }) => ({
            ruta: archivo.ruta,
            linea: lineaDe(archivo.contenido, tabla.indice),
            mensaje: `La tabla \`${tabla.nombre}\` ${fallas.join("; ")}.`,
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
