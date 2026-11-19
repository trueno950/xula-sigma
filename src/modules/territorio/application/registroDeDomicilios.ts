import { comoLugarId, exigirLimiteValido, resolverPagina } from "../domain";
import type {
  FiltrosDeRegistro,
  RepositorioDeRegistroDeDomicilios,
} from "./puertosDeDomicilios";

/**
 * Tamano de pagina fijo de `design.md`, seccion "Paginacion": bajarlo no
 * ahorra en la red rural -sigue siendo una sola respuesta HTML-, y subirlo
 * pierde el punto de paginar. Propia y no heredada de configuracion, mismo
 * criterio que `TAMANO_DE_PAGINA` en `reportes/application/listarReportes.ts`
 * y en `padron`.
 */
export const TAMANO_DE_PAGINA = 50;

/**
 * El tope de `?limite=`, que es un parametro de URL y por lo tanto entrada
 * del cliente: sin cota, `?limite=9999999` pide el municipio entero en una
 * respuesta. Vive aca y no en el esquema de la ruta porque "Ver mas" tiene
 * que conocerlo para no ofrecer un link que el esquema va a rechazar.
 */
export const LIMITE_MAXIMO = TAMANO_DE_PAGINA * 40;

export type SolicitudDeRegistroDeDomicilios = {
  readonly tx: Parameters<RepositorioDeRegistroDeDomicilios["registro"]>[0];
  readonly filtros: FiltrosDeRegistro;
  readonly limite: number;
};

export function crearRegistroDeDomicilios(
  repositorio: RepositorioDeRegistroDeDomicilios,
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
    const normalizados = normalizarFiltros({
      ...filtros,
      ...(raizId ? { raizId } : {}),
    });
    // Los dos numeros de la linea de conteo salen de una sola lectura, y en
    // la misma transaccion: `coincidencias` con los filtros puestos,
    // `total` del municipio entero.
    const { total, coincidencias } = await repositorio.contar(tx, normalizados);
    const filas = await repositorio.registro(tx, {
      limite: limite + 1,
      filtros: normalizados,
    });
    const pagina = resolverPagina(filas, limite);

    return {
      domicilios: pagina.filas,
      hayMas: pagina.hayMas,
      total,
      coincidencias,
    };
  };
}

/**
 * Recorta y descarta los filtros en blanco. No valida `raizId` -eso pasa en
 * el cuerpo del caso de uso, que es donde puede tirar-; y el descarte no es
 * cosmetico: `registroDeDomiciliosSql` lee un filtro vacio como ausente, asi
 * que un numero o una busqueda de solo espacios devolveria el municipio entero
 * en vez de nada.
 */
const normalizarFiltros = (filtros: FiltrosDeRegistro): FiltrosDeRegistro => {
  const calle = filtros.calle?.trim();
  const numero = filtros.numero?.trim();
  const busqueda = filtros.busqueda?.trim();

  return {
    ...(filtros.raizId ? { raizId: filtros.raizId } : {}),
    ...(filtros.calleId ? { calleId: filtros.calleId } : {}),
    ...(calle ? { calle } : {}),
    ...(numero ? { numero } : {}),
    ...(busqueda ? { busqueda } : {}),
  };
};
