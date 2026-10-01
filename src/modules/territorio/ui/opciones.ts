import { type OpcionDeLista, opcionesEtiquetadas } from "@/shared/ui";
import type { CalleGuardada, LugarGuardado } from "../application/puertos";
import type { DomicilioParaListado } from "../application/puertosDeDomicilios";
import {
  ETIQUETA_DE_TIPO_DE_LUGAR,
  type TipoDeLugar,
  tipoDeLugarEnFrase,
} from "../domain";

/**
 * Como se lee cada entidad del modulo dentro de un `<select>`.
 *
 * Vive aparte de los formularios porque el mismo lugar se elige en tres
 * -alta, reparenteo y el alta desde la entrada- y la etiqueta tiene que
 * decir lo mismo en los tres. Cuando cada formulario armaba sus opciones,
 * uno mostraba "Centro (COLONIA)" y otro solo "Centro", y el operador no
 * sabia si eran el mismo lugar.
 */
export const opcionesDeLugares = (
  lugares: readonly Pick<LugarGuardado, "id" | "nombre" | "tipo">[],
): readonly OpcionDeLista[] =>
  lugares.map((lugar) => ({
    valor: lugar.id,
    etiqueta: `${lugar.nombre} (${tipoDeLugarEnFrase(lugar.tipo)})`,
  }));

export const opcionesDeCalles = (
  calles: readonly Pick<CalleGuardada, "id" | "nombre">[],
): readonly OpcionDeLista[] =>
  calles.map((calle) => ({ valor: calle.id, etiqueta: calle.nombre }));

/** La direccion completa: sin el lugar, dos "Calle 20 #5" son ambiguas. */
export const opcionesDeDomicilios = (
  domicilios: readonly DomicilioParaListado[],
): readonly OpcionDeLista[] =>
  domicilios.map((domicilio) => ({
    valor: domicilio.id,
    etiqueta: `${domicilio.lugar} — ${domicilio.calle} ${
      domicilio.numero ?? "S/N"
    }`,
  }));

export const opcionesDeTipos = (
  tipos: readonly TipoDeLugar[],
): readonly OpcionDeLista[] =>
  opcionesEtiquetadas(tipos, ETIQUETA_DE_TIPO_DE_LUGAR);
