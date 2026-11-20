import {
  borradorDeLaPeticion as borradorDeLaPeticionCompartido,
  descartarBorrador as descartarBorradorCompartido,
  type EspacioDeBorrador,
  guardarBorrador as guardarBorradorCompartido,
  nuevoToken,
} from "@/shared/ui/borradorEnCookie";
import {
  type BorradorDeDomicilio,
  camposDelFormulario,
  type DestinoDeBorrador,
  decodificarBorrador,
  seRecortaAlGuardar,
} from "./borradorDeDomicilio";

/** La cookie de los formularios de domicilio; el mecanismo y su porqué están
 * en `@/shared/ui/borradorEnCookie`. */
const ESPACIO: EspacioDeBorrador = {
  cookie: "borrador-de-domicilio",
  ruta: "/territorio",
};

const nuevoBorrador = (
  destino: DestinoDeBorrador,
  formData: FormData,
  nombreDeZona: "lugarId" | "zonaId",
): BorradorDeDomicilio => ({
  token: nuevoToken(),
  destino,
  campos: camposDelFormulario(formData, nombreDeZona),
  ...(seRecortaAlGuardar(formData, nombreDeZona) ? { recortado: true } : {}),
});

export const borradorDeAlta = (formData: FormData): BorradorDeDomicilio =>
  nuevoBorrador({ formulario: "alta" }, formData, "lugarId");

export const borradorDeCorreccion = (
  formData: FormData,
  domicilioId: string,
): BorradorDeDomicilio =>
  nuevoBorrador({ formulario: "correccion", domicilioId }, formData, "zonaId");

export const guardarBorrador = (borrador: BorradorDeDomicilio): Promise<void> =>
  guardarBorradorCompartido(ESPACIO, borrador);

export const descartarBorrador = (): Promise<void> =>
  descartarBorradorCompartido(ESPACIO);

export const borradorDeLaPeticion = (
  token: string | undefined,
): Promise<BorradorDeDomicilio | null> =>
  borradorDeLaPeticionCompartido(ESPACIO, token, decodificarBorrador);
