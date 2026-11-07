import type { OpcionDeLista } from "@/shared/ui";
import type { CalleDelMunicipio } from "../application/listarCallesDelMunicipio";
import type { LugarId } from "../domain";
import type { Asentamiento } from "./vistaDeDomicilios";

export type NivelDelFormulario = {
  opciones: readonly OpcionDeLista[];
  /** El primer `<option>`: el asentamiento, o "Sin colonia" cuando no se conoce. */
  marcador: string;
  /** El nivel con el que abre el select: el nodo actual, o vacio. */
  inicial: LugarId | "";
  /** La frase completa que describe donde se guarda por defecto. */
  resumen: string;
  /**
   * No hay ninguna colonia en el alcance. `SelectorDeColonia` no pinta un
   * select: pinta el resumen, que dice por que.
   */
  sinZonas: boolean;
  /** Las mismas `opciones`, repartidas por el asentamiento que las contiene. */
  grupos: readonly GrupoDeColonias[];
  /** La opcion explicita de «Sin colonia»; solo el alta la ofrece. */
  sinColonia?: OpcionDeLista | undefined;
};

/** Las colonias de un asentamiento, para un `<optgroup>`. */
export type GrupoDeColonias = {
  asentamiento: Asentamiento;
  opciones: readonly OpcionDeLista[];
};

/** De cada calle, el asentamiento que la tiene en su catalogo. */
export type AsentamientoDeCalle = Readonly<
  Record<string, Asentamiento | undefined>
>;

/**
 * Lo que el campo de Colonia ofrece. `ninguna` no es un select vacio: es
 * una linea, porque un `<select>` con una sola opcion muerta se lee como un
 * control roto.
 */
export type ColoniasAOfrecer =
  | { forma: "ninguna"; mensaje: string }
  | { forma: "lista"; opciones: readonly OpcionDeLista[] }
  | { forma: "grupos"; grupos: readonly GrupoDeColonias[] };

export const mensajeSinColonias = (asentamiento: string): string =>
  `${asentamiento} no tiene colonias; el domicilio queda en ${asentamiento}.`;

/**
 * Con la calle elegida, solo las colonias de su asentamiento: ofrecer las
 * de otro termina en `UbicacionIncoherenteError` al enviar. Sin calle
 * elegida -o sin JavaScript, que no sabe cual es- van agrupadas por
 * asentamiento, para que se pueda elegir con coherencia igual.
 */
export const coloniasAOfrecer = (
  nivel: Pick<
    NivelDelFormulario,
    "opciones" | "grupos" | "sinZonas" | "resumen"
  >,
  asentamiento: Asentamiento | undefined,
): ColoniasAOfrecer => {
  if (nivel.sinZonas) return { forma: "ninguna", mensaje: nivel.resumen };

  if (asentamiento) {
    const grupo = nivel.grupos.find(
      (candidato) => candidato.asentamiento.id === asentamiento.id,
    );

    return grupo
      ? { forma: "lista", opciones: grupo.opciones }
      : { forma: "ninguna", mensaje: mensajeSinColonias(asentamiento.nombre) };
  }

  return nivel.grupos.length > 1
    ? { forma: "grupos", grupos: nivel.grupos }
    : { forma: "lista", opciones: nivel.opciones };
};

export const asentamientosDeCalles = (
  calles: readonly CalleDelMunicipio[],
): AsentamientoDeCalle =>
  Object.fromEntries(
    calles.map((calle) => [
      calle.id,
      { id: calle.lugarId, nombre: calle.asentamiento },
    ]),
  );
