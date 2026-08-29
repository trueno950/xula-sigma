import {
  esCodigoDeAplicacion,
  esTypeScript,
  lineaDe,
  sinComentariosNiCadenas,
} from "../comunes";
import type { Regla } from "../tipos";

/**
 * El filesystem del contenedor es efimero: lo que se escribe ahi
 * desaparece en el proximo despliegue.
 *
 * Los tests quedan afuera porque leen fixtures del repositorio, que no es
 * lo mismo que guardar el escudo de un municipio; los scripts tambien,
 * porque corren en una maquina, no en el contenedor.
 */
export const assetsAlFilesystem: Regla = {
  id: "assets-filesystem",
  antipatron: 12,
  titulo: "Filesystem del contenedor en vez de object storage",
  revisar(archivos) {
    const hallazgos = [];

    for (const archivo of archivos) {
      if (!esCodigoDeAplicacion(archivo.ruta)) continue;

      const patron = /from\s+["'](node:)?fs(\/promises)?["']/g;

      for (const encontrado of archivo.contenido.matchAll(patron)) {
        hallazgos.push({
          ruta: archivo.ruta,
          linea: lineaDe(archivo.contenido, encontrado.index),
          mensaje:
            "El filesystem del contenedor es efimero. Los assets van a object storage.",
        });
      }
    }

    return hallazgos;
  },
};

/**
 * Identificadores sin acentos ni enies. El espanol va en el dominio y en el
 * texto, no en los nombres que despues alguien tiene que teclear o buscar.
 *
 * Corre sobre el codigo sin comentarios ni cadenas: el proyecto quiere el
 * espanol CORRECTO ahi, con sus acentos.
 */
export const identificadorConDiacriticos: Regla = {
  id: "identificador-ascii",
  antipatron: 20,
  titulo: "Acentos o enies en un identificador",
  revisar(archivos) {
    const hallazgos = [];

    for (const archivo of archivos) {
      if (!esTypeScript(archivo.ruta)) continue;

      const codigo = sinComentariosNiCadenas(archivo.contenido);
      const patron =
        /\b(?:const|let|var|function|class|interface|type|enum)\s+([\p{L}_$][\p{L}\p{N}_$]*)/gu;

      for (const encontrado of codigo.matchAll(patron)) {
        const nombre = encontrado[1] ?? "";
        if (!/[^\p{ASCII}]/u.test(nombre)) continue;

        hallazgos.push({
          ruta: archivo.ruta,
          linea: lineaDe(codigo, encontrado.index),
          mensaje: `El identificador \`${nombre}\` lleva diacriticos. Van sin acentos ni enies.`,
        });
      }
    }

    return hallazgos;
  },
};

/**
 * Un modulo nace con sus cuatro capas. Empezar sin `domain` termina en
 * logica de negocio dentro del repositorio, y moverla despues cuesta mas
 * que crear la carpeta hoy.
 */
export const moduloSinCuatroCapas: Regla = {
  id: "modulo-cuatro-capas",
  antipatron: 21,
  titulo: "Modulo con capas incompletas",
  revisar(archivos) {
    const capas = ["domain", "application", "infrastructure", "ui"];
    const porModulo = new Map<string, Set<string>>();

    for (const archivo of archivos) {
      const encontrado = /^src\/modules\/([^/]+)\/([^/]+)\//.exec(archivo.ruta);
      if (!encontrado) continue;

      const modulo = encontrado[1] as string;
      if (!porModulo.has(modulo)) porModulo.set(modulo, new Set());
      porModulo.get(modulo)?.add(encontrado[2] as string);
    }

    const hallazgos = [];

    for (const [modulo, presentes] of [...porModulo].sort()) {
      const faltantes = capas.filter((capa) => !presentes.has(capa));
      if (faltantes.length === 0) continue;

      hallazgos.push({
        ruta: `src/modules/${modulo}`,
        linea: 1,
        mensaje: `Al modulo \`${modulo}\` le faltan capas: ${faltantes.join(", ")}.`,
      });
    }

    return hallazgos;
  },
};

/**
 * Una cita a la linea de un paquete se mueve sola en el proximo bump y
 * nadie se entera. Con la version al lado, el dia que deja de ser cierta se
 * puede saber.
 *
 * Solo `.mjs` y `.cjs`, que es como se distribuyen los bundles: el codigo
 * propio es `.ts` y viaja con el repositorio, asi que su linea la corrige
 * el mismo diff que la mueve.
 *
 * La ventana de 120 caracteres cruza el salto de linea a proposito. Con el
 * ancho de 80 columnas del proyecto, la version cae en la linea siguiente
 * seguido —`bdSobreTransaccion.ts` y `verificacionPorAdaptador` hoy—, y una
 * ventana de una sola linea los marcaria a todos.
 */
export const citaSinVersion: Regla = {
  id: "cita-con-version",
  antipatron: 25,
  titulo: "Cita a la linea de un paquete sin su version",
  revisar(archivos) {
    const hallazgos = [];

    for (const archivo of archivos) {
      if (!esTypeScript(archivo.ruta)) continue;

      const patron = /([\w./@-]+\.(?:mjs|cjs)):(\d+)/g;

      for (const encontrado of archivo.contenido.matchAll(patron)) {
        const ventana = archivo.contenido.slice(
          encontrado.index,
          encontrado.index + 120,
        );
        if (/\d+\.\d+\.\d+/.test(ventana)) continue;

        hallazgos.push({
          ruta: archivo.ruta,
          linea: lineaDe(archivo.contenido, encontrado.index),
          mensaje: `La cita a \`${encontrado[1]}:${encontrado[2]}\` no lleva version. Se mueve sola en el proximo bump.`,
        });
      }
    }

    return hallazgos;
  },
};
