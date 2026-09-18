import { comoLugarId, exigirLimiteValido, resolverPagina } from "../domain";
import type {
  FiltrosDeRegistro,
  RepositorioDeDomicilios,
} from "./puertosDeDomicilios";

export type SolicitudDeRegistroDeDomicilios = {
  readonly tx: Parameters<RepositorioDeDomicilios["registro"]>[0];
  readonly filtros: FiltrosDeRegistro;
  readonly limite: number;
};

export function crearRegistroDeDomicilios(
  repositorio: RepositorioDeDomicilios,
) {
  return async function registroDeDomicilios({
    tx,
    filtros,
    limite,
  }: SolicitudDeRegistroDeDomicilios) {
    // Las dos validaciones van antes del viaje a la base: `comoLugarId` tira
    // con un id malformado, y el limite se rechaza aca y no en
    // `resolverPagina`, que corre recien con las filas ya traidas.
    exigirLimiteValido(limite);
    const raizId = filtros.raizId ? comoLugarId(filtros.raizId) : undefined;
    const filas = await repositorio.registro(tx, {
      limite: limite + 1,
      filtros: normalizarFiltros({
        ...filtros,
        ...(raizId ? { raizId } : {}),
      }),
    });
    const pagina = resolverPagina(filas, limite);

    return { domicilios: pagina.filas, hayMas: pagina.hayMas };
  };
}

/**
 * Recorta y descarta los filtros en blanco. No valida `raizId` -eso pasa en
 * el cuerpo del caso de uso, que es donde puede tirar-; y el descarte no es
 * cosmetico: `registroDeDomiciliosSql` lee un filtro vacio como ausente, asi
 * que un numero de solo espacios devolveria el municipio entero en vez de
 * nada.
 */
const normalizarFiltros = (filtros: FiltrosDeRegistro): FiltrosDeRegistro => {
  const calle = filtros.calle?.trim();
  const numero = filtros.numero?.trim();

  return {
    ...(filtros.raizId ? { raizId: filtros.raizId } : {}),
    ...(calle ? { calle } : {}),
    ...(numero ? { numero } : {}),
  };
};
