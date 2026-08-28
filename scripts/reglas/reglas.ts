/**
 * Las reglas de AGENTS.md que una expresion regular decide sola.
 *
 * Existe porque el revisor de IA estaba haciendo este trabajo. Un modelo
 * cuesta dinero por corrida, tarda minutos y —medido en este repositorio—
 * no coincide consigo mismo entre dos corridas del mismo comando sobre el
 * mismo diff: el pre-push y el job de CI ejecutan `gga run --pr-mode
 * --diff-only` con la misma variante y el mismo modelo, y aun asi CI
 * encontraba hallazgos que el pre-push no. Eso no es un gate, es un dado.
 *
 * Lo que se puede decidir con un patron se decide con un patron: cuesta
 * cero, tarda milisegundos y da el mismo resultado siempre. Al revisor de
 * IA le queda lo que un patron no puede juzgar —si un `try/catch` traga el
 * error, si un nombre es vago, si un comentario reformula el codigo—, que
 * es donde su costo se justifica.
 *
 * Cada regla nombra el antipatron de AGENTS.md que aplica. Si un antipatron
 * no esta aca, es porque pide criterio, no porque se haya olvidado.
 */

export type Archivo = {
  ruta: string;
  contenido: string;
};

export type Hallazgo = {
  regla: string;
  antipatron: number;
  ruta: string;
  linea: number;
  mensaje: string;
};

export type Regla = {
  id: string;
  antipatron: number;
  titulo: string;
  revisar(archivos: Archivo[]): Omit<Hallazgo, "regla" | "antipatron">[];
};

const lineaDe = (contenido: string, indice: number): number =>
  contenido.slice(0, indice).split("\n").length;

const esTest = (ruta: string): boolean => /\.test\.tsx?$/.test(ruta);

const esCodigoDeAplicacion = (ruta: string): boolean =>
  ruta.startsWith("src/") && !esTest(ruta);

const esTypeScript = (ruta: string): boolean => /\.tsx?$/.test(ruta);

const esSql = (ruta: string): boolean => ruta.endsWith(".sql");

const escapar = (texto: string): string =>
  texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Deja el codigo sin comentarios ni cadenas, reemplazando cada uno por
 * espacios para no mover los indices —de ahi salen los numeros de linea.
 *
 * Es un barrido lexico aproximado, no un parser: no distingue una expresion
 * regular con `//` adentro de un comentario. Alcanza para lo unico que lo
 * usa, que es buscar declaraciones, y el costo de equivocarse es un falso
 * negativo, no una falsa alarma.
 */
const sinComentariosNiCadenas = (contenido: string): string =>
  contenido.replace(
    /\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g,
    (encontrado) => encontrado.replace(/[^\n]/g, " "),
  );

/**
 * El driver, no el constructor de consultas.
 *
 * `drizzle-orm` a secas exporta `eq`, `and`, `sql`: lo importa cada
 * repositorio y no abre ninguna conexion. Lo que abre conexion es el
 * paquete `postgres` y el adaptador `drizzle-orm/postgres-js`, y esos dos
 * viven solo en `shared/tenancy`. La regla mira exactamente esos.
 */
const driverFueraDeTenancy: Regla = {
  id: "tenancy-driver",
  antipatron: 2,
  titulo: "Conexion a base de datos fuera de shared/tenancy",
  revisar(archivos) {
    const hallazgos = [];

    for (const archivo of archivos) {
      // El alcance es parte de la regla: AGENTS.md dice "en `src/`". El
      // andamiaje de E2E y los scripts de mantenimiento siembran la base
      // antes de que exista un tenant contra el cual abrir una sesion.
      if (!esTypeScript(archivo.ruta)) continue;
      if (!archivo.ruta.startsWith("src/")) continue;
      if (archivo.ruta.startsWith("src/shared/tenancy/")) continue;

      const patron = /from\s+["'](postgres|drizzle-orm\/postgres-js)["']/g;

      for (const encontrado of archivo.contenido.matchAll(patron)) {
        hallazgos.push({
          ruta: archivo.ruta,
          linea: lineaDe(archivo.contenido, encontrado.index),
          mensaje: `Importa \`${encontrado[1]}\` directo. El acceso a la base va por \`shared/tenancy\`.`,
        });
      }
    }

    return hallazgos;
  },
};

/**
 * `SET` sin `LOCAL` sobrevive a la transaccion, se queda pegado en la
 * conexion del pooler y lo hereda el siguiente request, que puede ser de
 * otro municipio.
 *
 * Mira parametros con punto —`app.tenant`— y no cualquier `SET`. Sin esa
 * restriccion, `ON DELETE SET NULL` y `ALTER COLUMN ... SET DEFAULT`
 * marcarian en cada migracion, y una regla que grita sobre codigo sano se
 * termina desactivando.
 */
const setSinLocal: Regla = {
  id: "set-local",
  antipatron: 3,
  titulo: "SET de parametro de sesion sin LOCAL",
  revisar(archivos) {
    const hallazgos = [];

    for (const archivo of archivos) {
      if (!esTypeScript(archivo.ruta) && !esSql(archivo.ruta)) continue;

      const patron =
        /\bSET\s+(?!LOCAL\b)([a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*)\s*(?:=|\bTO\b)/gi;

      for (const encontrado of archivo.contenido.matchAll(patron)) {
        hallazgos.push({
          ruta: archivo.ruta,
          linea: lineaDe(archivo.contenido, encontrado.index),
          mensaje: `\`SET ${encontrado[1]}\` sin \`LOCAL\`: sobrevive a la transaccion y lo hereda el proximo request.`,
        });
      }
    }

    return hallazgos;
  },
};

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
    {
      que: "GRANT",
      patron: new RegExp(`GRANT[^;]*?\\bON\\s+"${n}"`),
    },
  ]
    .filter(({ patron }) => !patron.test(contenido))
    .map(({ que }) => que);
};

const tablasDeMunicipio = (archivo: Archivo) =>
  [
    ...archivo.contenido.matchAll(
      /CREATE TABLE\s+"([^"]+)"\s*\(([\s\S]*?)\n\);/g,
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

const rlsEnTablaNueva: Regla = {
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
const secuenciaParaFolios: Regla = {
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

/**
 * El filesystem del contenedor es efimero: lo que se escribe ahi
 * desaparece en el proximo despliegue.
 *
 * Los tests quedan afuera porque leen fixtures del repositorio, que no es
 * lo mismo que guardar el escudo de un municipio; los scripts tambien,
 * porque corren en una maquina, no en el contenedor.
 */
const assetsAlFilesystem: Regla = {
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
const identificadorConDiacriticos: Regla = {
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
const moduloSinCuatroCapas: Regla = {
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
const citaSinVersion: Regla = {
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

export const reglas: Regla[] = [
  driverFueraDeTenancy,
  setSinLocal,
  rlsEnTablaNueva,
  secuenciaParaFolios,
  assetsAlFilesystem,
  identificadorConDiacriticos,
  moduloSinCuatroCapas,
  citaSinVersion,
];

export function revisar(archivos: Archivo[]): Hallazgo[] {
  return reglas.flatMap((regla) =>
    regla.revisar(archivos).map((hallazgo) => ({
      regla: regla.id,
      antipatron: regla.antipatron,
      ...hallazgo,
    })),
  );
}
