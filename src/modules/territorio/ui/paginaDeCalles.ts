import { normalizarParaBusqueda } from "@/shared/lib/textoDeBusqueda";
import { TAMANO_DE_PAGINA } from "../application/registroDeDomicilios";
import type { FiltrosDeLaPestana } from "./hrefsDeLaPestana";

/**
 * La pagina visible de la pestana Calles. Se recorta en memoria y no en la
 * consulta: la pantalla ya trae el catalogo entero del asentamiento porque
 * lo necesitan los `<select>` de los formularios de domicilio, el panel de
 * la calle abierta y el 404 de `?calle=` ajena (`cargaDeTerritorio.ts`).
 */
export const paginaDeCalles = <C extends { readonly nombre: string }>(
  calles: readonly C[],
  { busqueda, limite }: FiltrosDeLaPestana,
): { filas: readonly C[]; hayMas: boolean } => {
  const filtro = busqueda ? normalizarParaBusqueda(busqueda) : "";
  const coinciden = filtro
    ? calles.filter((calle) =>
        normalizarParaBusqueda(calle.nombre).includes(filtro),
      )
    : calles;
  const tope = limite ?? TAMANO_DE_PAGINA;

  return { filas: coinciden.slice(0, tope), hayMas: coinciden.length > tope };
};
