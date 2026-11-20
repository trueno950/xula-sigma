import {
  borradorDeLaPeticion as borradorDeLaPeticionCompartido,
  descartarBorrador as descartarBorradorCompartido,
  type EspacioDeBorrador,
  guardarBorrador as guardarBorradorCompartido,
} from "@/shared/ui/borradorEnCookie";
import {
  type BorradorDeIntervencion,
  decodificarBorrador,
} from "./borradorDeIntervencion";

/** La cookie del alta de intervenciones; el mecanismo y su porqué están en
 * `@/shared/ui/borradorEnCookie`. */
const ESPACIO: EspacioDeBorrador = {
  cookie: "borrador-de-intervencion",
  ruta: "/intervenciones",
};

export const guardarBorrador = (
  borrador: BorradorDeIntervencion,
): Promise<void> => guardarBorradorCompartido(ESPACIO, borrador);

export const descartarBorrador = (): Promise<void> =>
  descartarBorradorCompartido(ESPACIO);

export const borradorDeLaPeticion = (
  token: string | undefined,
): Promise<BorradorDeIntervencion | null> =>
  borradorDeLaPeticionCompartido(ESPACIO, token, decodificarBorrador);
