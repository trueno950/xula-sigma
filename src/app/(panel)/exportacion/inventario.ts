/**
 * Como se agrupa y como se explica el inventario de S10 y S11
 * (`design/exportacion/01`, elegido en L6).
 *
 * Los grupos son los del resto del panel —plataforma, padron, territorio,
 * constancias, reportes, intervenciones— para que el inventario se lea con el
 * mismo mapa con el que se lee el panel. El texto de cada conjunto vive aca,
 * una sola vez: lo que el archivo *tiene* lo dice su CSV, no este archivo.
 */

export type ClaveDeGrupo =
  | "plataforma"
  | "padron"
  | "territorio"
  | "constancias"
  | "reportes"
  | "intervenciones"
  | "otros";

export type ConjuntoDelInventario = {
  archivo: string;
  filas: number;
  /** Que lleva, para la operadora. */
  lleva: string;
  llevaDatosDelPersonal: boolean;
};

export type GrupoDelInventario = {
  clave: ClaveDeGrupo;
  titulo: string;
  archivos: number;
  filas: number;
  conjuntos: readonly ConjuntoDelInventario[];
};

const ORDEN: readonly { clave: ClaveDeGrupo; titulo: string }[] = [
  { clave: "plataforma", titulo: "Plataforma del ayuntamiento" },
  { clave: "padron", titulo: "Padrón" },
  { clave: "territorio", titulo: "Territorio" },
  { clave: "constancias", titulo: "Constancias" },
  { clave: "reportes", titulo: "Reportes" },
  { clave: "intervenciones", titulo: "Intervenciones" },
  { clave: "otros", titulo: "Otros conjuntos" },
];

type Descripcion = {
  grupo: ClaveDeGrupo;
  lleva: string;
  /** La marca de S10: el archivo lleva datos del personal. */
  personal?: true;
};

const DESCRIPCIONES: Record<string, Descripcion> = {
  usuarios: {
    grupo: "plataforma",
    lleva:
      "Nombre, correo y rol de cada cuenta de este ayuntamiento, y si está dada de baja.",
    personal: true,
  },
  bitacora: {
    grupo: "plataforma",
    lleva:
      "Quién hizo qué, sobre qué registro, desde dónde y cuándo. No tiene pantalla en el panel: este archivo es la única forma de leerlo.",
  },
  personas: {
    grupo: "padron",
    lleva:
      "Personas del padrón con su CURP, su domicilio vigente y si están fusionadas o dadas de baja.",
  },
  lugares: {
    grupo: "territorio",
    lleva:
      "Colonias, fraccionamientos y demás lugares, con el lugar del que cuelgan.",
  },
  calles: {
    grupo: "territorio",
    lleva: "Calles con su asentamiento y, si ya se ubicaron, su coordenada.",
  },
  domicilios: {
    grupo: "territorio",
    lleva: "Direcciones con calle, transversal, número y asentamiento.",
  },
  residencias: {
    grupo: "territorio",
    lleva: "Quién vivió en qué domicilio y desde cuándo.",
  },
  zonas: {
    grupo: "territorio",
    lleva: "Zonas del municipio, para organizar cuadrillas.",
  },
  calles_de_zonas: {
    grupo: "territorio",
    lleva: "Qué calle pertenece a qué zona.",
  },
  eventos_de_calles: {
    grupo: "territorio",
    lleva: "Cambios de nombre o de ubicación de una calle, con su motivo.",
  },
  constancias: {
    grupo: "constancias",
    lleva: "Constancias emitidas, con folio, tipo y a nombre de quién.",
  },
  reimpresiones: {
    grupo: "constancias",
    lleva: "Reimpresiones, con la constancia original y el motivo.",
  },
  configuracion_de_documentos: {
    grupo: "constancias",
    lleva: "Qué documentos emite el municipio y con qué textos.",
  },
  folios_de_documentos: {
    grupo: "constancias",
    lleva: "El consecutivo de folios de cada tipo de documento.",
  },
  reportes: {
    grupo: "reportes",
    lleva:
      "Reportes ciudadanos con su tipo, su estado y su ubicación. Sin el nombre de quien reportó.",
  },
  movimientos_de_reportes: {
    grupo: "reportes",
    lleva: "Cada cambio de estado de un reporte, con quién lo hizo y cuándo.",
  },
  folios_de_reportes: {
    grupo: "reportes",
    lleva: "El consecutivo de folios de reportes.",
  },
  intervenciones: {
    grupo: "intervenciones",
    lleva: "Obras y servicios con su tipo, su estado y su fecha de ocurrencia.",
  },
  revisiones_de_intervenciones: {
    grupo: "intervenciones",
    lleva: "Revisiones del avance de una intervención.",
  },
};

/**
 * Un conjunto al que todavia nadie le escribio su texto. Se muestra igual —con
 * lo que el archivo se llama y cuantas filas trae— debajo de «Otros
 * conjuntos»: esconderlo seria peor, y el test de `inventario.test.ts` es el
 * que exige que hoy no quede ninguno sin describir.
 */
const SIN_DESCRIPCION: Descripcion = {
  grupo: "otros",
  lleva: "Un conjunto de datos de este ayuntamiento.",
};

export const agruparInventario = (
  conjuntos: readonly { nombre: string; filas: number }[],
): readonly GrupoDelInventario[] => {
  const agrupados = new Map<ClaveDeGrupo, ConjuntoDelInventario[]>();

  for (const { nombre, filas } of conjuntos) {
    const descripcion = DESCRIPCIONES[nombre] ?? SIN_DESCRIPCION;
    const delGrupo = agrupados.get(descripcion.grupo) ?? [];

    delGrupo.push({
      archivo: `${nombre}.csv`,
      filas,
      lleva: descripcion.lleva,
      llevaDatosDelPersonal: descripcion.personal === true,
    });
    agrupados.set(descripcion.grupo, delGrupo);
  }

  return ORDEN.flatMap(({ clave, titulo }) => {
    const delGrupo = agrupados.get(clave);
    if (!delGrupo) return [];

    return [
      {
        clave,
        titulo,
        archivos: delGrupo.length,
        filas: delGrupo.reduce((suma, conjunto) => suma + conjunto.filas, 0),
        conjuntos: delGrupo,
      },
    ];
  });
};

/**
 * Los archivos que lleva el ZIP: los conjuntos, el manifiesto y —solo si el
 * municipio tiene escudo— su PNG. Contar los conjuntos a secas prometeria un
 * archivo menos de los que la operadora va a ver al abrirlo.
 */
export const totalDeArchivos = (
  grupos: readonly GrupoDelInventario[],
  tieneEscudo: boolean,
): number =>
  grupos.reduce((suma, grupo) => suma + grupo.archivos, 0) +
  1 +
  (tieneEscudo ? 1 : 0);

/** Las filas de todo el ZIP: la suma que el resumen de S11 muestra arriba. */
export const totalDeFilas = (grupos: readonly GrupoDelInventario[]): number =>
  grupos.reduce((suma, grupo) => suma + grupo.filas, 0);
