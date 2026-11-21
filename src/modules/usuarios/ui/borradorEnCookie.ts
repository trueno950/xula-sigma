import {
  borradorDeLaPeticion as borradorDeLaPeticionCompartido,
  descartarBorrador as descartarBorradorCompartido,
  type EspacioDeBorrador,
  guardarBorrador as guardarBorradorCompartido,
} from "@/shared/ui/borradorEnCookie";
import {
  type BorradorDeAltaDeUsuario,
  decodificarBorrador,
} from "./borradorDeAltaDeUsuario";

/** La cookie del alta de usuarios; el mecanismo y su porqué están en
 * `@/shared/ui/borradorEnCookie`. */
const ESPACIO: EspacioDeBorrador = {
  cookie: "borrador-de-usuario",
  ruta: "/usuarios",
};

export const guardarBorrador = (
  borrador: BorradorDeAltaDeUsuario,
): Promise<void> => guardarBorradorCompartido(ESPACIO, borrador);

export const descartarBorrador = (): Promise<void> =>
  descartarBorradorCompartido(ESPACIO);

export const borradorDeLaPeticion = (
  token: string | undefined,
): Promise<BorradorDeAltaDeUsuario | null> =>
  borradorDeLaPeticionCompartido(ESPACIO, token, decodificarBorrador);
