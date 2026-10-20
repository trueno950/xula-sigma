import type { OpcionDeLista } from "@/shared/ui";
import {
  type LugarId,
  puedeTenerCatalogoDeCalles,
  type TipoDeLugar,
} from "../domain";
import {
  type Asentamiento,
  type LugarConPadre,
  opcionesDeNivel,
  resumenDeGuardado,
} from "./vistaDeDomicilios";

/**
 * El nivel de zona que arma el `<select>` de Colonia del alta y de la
 * correccion: sus opciones, el primer `<option>`, el nivel con el que abre y
 * la frase que describe donde se guarda. Vive aparte de
 * `vistaDeDomicilios.ts` porque esa vista se ocupa de como se lee un lugar y
 * este archivo de como se elige.
 */
export type NivelDelFormulario = {
  opciones: readonly OpcionDeLista[];
  /** El primer `<option>`: el asentamiento, o "Sin colonia" cuando no se conoce. */
  marcador: string;
  /** El nivel con el que abre el select: el nodo actual, o vacio. */
  inicial: LugarId | "";
  /** La frase completa que describe donde se guarda por defecto. */
  resumen: string;
  /**
   * No hay ninguna colonia, sector ni manzana en el municipio. El campo de
   * colonia no se puede elegir: `CamposDeDomicilio` lo deshabilita y el
   * marcador y el resumen dicen por que, en vez de dejar un `<select>` con
   * el marcador solo, que se lee como un control roto.
   */
  sinZonas: boolean;
};

const MARCADOR_SIN_ZONAS = "Sin colonias registradas";
const AYUDA_SIN_ZONAS =
  "Todavía no hay colonias, sectores ni manzanas en el municipio: el domicilio se guarda en el asentamiento de la calle. Cree una colonia dentro del asentamiento para poder elegirla.";

const marcadorDe = (
  sinZonas: boolean,
  asentamiento: Asentamiento | undefined,
): string => {
  if (sinZonas) return MARCADOR_SIN_ZONAS;
  if (asentamiento) return `Sin colonia: ${asentamiento.nombre}`;

  return "Sin colonia";
};

export const zonaConInicial = (
  lugares: readonly LugarConPadre[],
  asentamiento: Asentamiento | undefined,
  inicial: LugarId | "",
): NivelDelFormulario => {
  const opciones = opcionesDeNivel(lugares, asentamiento);
  const sinZonas = opciones.length === 0;

  return {
    opciones,
    sinZonas,
    marcador: marcadorDe(sinZonas, asentamiento),
    inicial,
    resumen: sinZonas
      ? AYUDA_SIN_ZONAS
      : resumenDeGuardado(lugares, asentamiento, inicial),
  };
};

export const zonaDelFormulario = (
  lugares: readonly LugarConPadre[],
  asentamiento: Asentamiento | undefined,
  lugarActual: { id: LugarId; tipo: TipoDeLugar } | undefined,
): NivelDelFormulario => {
  const inicial =
    lugarActual && !puedeTenerCatalogoDeCalles(lugarActual.tipo)
      ? lugarActual.id
      : "";

  return zonaConInicial(lugares, asentamiento, inicial);
};
