import { fechaCivilCorta } from "@/shared/lib/fecha";
import { ETIQUETA_DE_TIPO_DE_INTERVENCION } from "../domain";
import type { ValoresAnterioresDeIntervencion } from "./puertos";

/**
 * Los campos que `corregirIntervencion` puede cambiar (`estado` no: una
 * transicion no es una correccion y no escribe revision). El orden es el de
 * la ficha, para que dos cambios se lean en el mismo orden en que se ven.
 */
const CAMPOS = [
  "tipo",
  "fechaDeOcurrencia",
  "calleId",
  "lugarId",
  "reporteId",
  "descripcion",
] as const;

type Campo = (typeof CAMPOS)[number];

type Presentacion = {
  etiqueta: string;
  /** El renglon cuando es el unico cambio de la revision. */
  titulo: string;
};

const PRESENTACION: Record<Campo, Presentacion> = {
  tipo: { etiqueta: "Tipo", titulo: "Tipo corregido" },
  fechaDeOcurrencia: {
    etiqueta: "Fecha de ocurrencia",
    titulo: "Fecha de ocurrencia corregida",
  },
  calleId: { etiqueta: "Calle", titulo: "Calle corregida" },
  lugarId: { etiqueta: "Lugar", titulo: "Lugar corregido" },
  reporteId: {
    etiqueta: "Reporte de origen",
    titulo: "Reporte de origen corregido",
  },
  descripcion: { etiqueta: "Descripción", titulo: "Descripción corregida" },
};

export type CambioDeIntervencion = Presentacion & {
  /**
   * El valor anterior ya legible, o `null` cuando la revision guarda un id
   * cuyo nombre no vive en esta tabla (la calle, el lugar, el reporte). El
   * `null` es "no se puede nombrar sin inventar", no "no cambio".
   */
  anterior: string | null;
};

/**
 * El valor anterior de un campo, en lo que `revisiones_de_intervenciones`
 * sostiene por si sola: el tipo y la fecha se traducen, la descripcion se cita
 * tal cual, y de la calle solo se sabe si habia una o ninguna. El nombre de
 * una calle orilla o de un reporte pediria leer otro modulo para un dato del
 * pasado, y el historial no puede afirmar lo que no guarda (L4 de
 * `odd/tasks/intervenciones-ux.md`).
 */
const anteriorDe = (
  campo: Campo,
  antes: ValoresAnterioresDeIntervencion,
): string | null => {
  switch (campo) {
    case "tipo":
      return ETIQUETA_DE_TIPO_DE_INTERVENCION[antes.tipo];
    case "fechaDeOcurrencia":
      return fechaCivilCorta(antes.fechaDeOcurrencia);
    case "descripcion":
      return antes.descripcion;
    case "calleId":
      return antes.calleId === null ? "Sin calle" : null;
    case "reporteId":
      return antes.reporteId === null ? "Sin reporte" : null;
    default:
      return null;
  }
};

/** Que campos cambiaron entre dos fotos de la intervencion, en orden de ficha. */
export const cambiosEntre = (
  antes: ValoresAnterioresDeIntervencion,
  despues: ValoresAnterioresDeIntervencion,
): readonly CambioDeIntervencion[] =>
  CAMPOS.filter((campo) => antes[campo] !== despues[campo]).map((campo) => ({
    ...PRESENTACION[campo],
    anterior: anteriorDe(campo, antes),
  }));
