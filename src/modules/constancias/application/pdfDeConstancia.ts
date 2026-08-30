import type { ContextoActual } from "@/shared/auth/contexto";
import { NoEncontradoError } from "@/shared/lib/errores";
import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import {
  type TransaccionTenant,
  withTenant,
} from "@/shared/tenancy/withTenant";
import { type ConstanciaId, comoReimpresionId } from "../domain";
import type { RepositorioDeConstancias } from "./puertos";
import type {
  AyuntamientoLeido,
  LecturaDeAyuntamiento,
} from "./puertosDeLectura";
import type {
  EntradaDeRender,
  RenderizadorDeConstancias,
} from "./puertosDeRender";
import { esquemaDeSnapshot } from "./validacionDeSnapshot";

export type EntradaDePdf = {
  id: ConstanciaId;
  /** Crudo, sin validar: llega del query string de la ruta. */
  reimpresionId?: string;
};

export type SalidaDePdf = {
  bytes: Uint8Array;
  folio: string;
};

/**
 * El mismo `DOMINIO_BASE` que resuelve el tenant en `proxy.ts:40`, con el
 * mismo `?? "localhost"`. No hay un `shared/lib/configuracion.ts` que lo
 * centralice, y crear uno para una sola linea es mas costoso que
 * duplicarla (design.md de `constancias-oficios`, seccion 11: "los dos
 * insumos ya existen").
 */
const dominioBase = () => process.env.DOMINIO_BASE ?? "localhost";

/**
 * `true` solo si `reimpresionIdCrudo` acredita: existe **y** es de
 * `constanciaId` (design.md de `constancias-oficios`, seccion 11, FK
 * compuesto). Un `reimpresionId` ausente es simplemente "no es una
 * reimpresion" -`false`, sin lanzar-; uno presente que no acredita lanza
 * `NoEncontradoError` antes de que el llamador toque el renderizador. Un
 * `reimpresionId` que ni siquiera es un UUID cae en el mismo `catch` que
 * uno bien formado que no existe: las dos son la misma respuesta.
 */
async function verificarReimpresion(
  repositorio: RepositorioDeConstancias,
  tx: TransaccionTenant,
  reimpresionIdCrudo: string | undefined,
  constanciaId: ConstanciaId,
): Promise<boolean> {
  if (reimpresionIdCrudo === undefined) return false;

  const acreditada = await intentarAcreditar(
    repositorio,
    tx,
    reimpresionIdCrudo,
    constanciaId,
  );
  if (!acreditada) throw new NoEncontradoError();

  return true;
}

/**
 * Separado de `verificarReimpresion` para que el `try/catch` cubra tambien
 * la construccion de `comoReimpresionId`, no solo la consulta: un
 * `reimpresionId` que ni siquiera tiene forma de UUID lanza **sincronico**
 * al construirse, y sin este `try` alrededor de las dos cosas ese throw se
 * escaparia crudo -sin convertirse en `NoEncontradoError`- en vez de caer en
 * la misma rama que "no existe".
 */
async function intentarAcreditar(
  repositorio: RepositorioDeConstancias,
  tx: TransaccionTenant,
  reimpresionIdCrudo: string,
  constanciaId: ConstanciaId,
): Promise<boolean> {
  try {
    const reimpresionId = comoReimpresionId(reimpresionIdCrudo);
    return await repositorio.existeReimpresion(tx, reimpresionId, constanciaId);
  } catch {
    return false;
  }
}

/**
 * El ayuntamiento del render (design.md seccion 4: `municipio.nombre` no se
 * guarda, se lee de `ayuntamientos` al renderizar). El `throw` es
 * estructuralmente inalcanzable dentro de este `withTenant`: la fila de
 * `constancias` que ya se leyo tiene una FK viva (`columnaTenant`) hacia
 * `ayuntamientos`, asi que si esa fila existe, la del ayuntamiento tambien.
 */
async function municipioDe(
  lecturaDeAyuntamiento: LecturaDeAyuntamiento,
  tx: TransaccionTenant,
  ayuntamientoId: AyuntamientoId,
): Promise<AyuntamientoLeido> {
  const ayuntamiento = await lecturaDeAyuntamiento.porId(tx, ayuntamientoId);
  if (!ayuntamiento) throw new NoEncontradoError();

  return ayuntamiento;
}

const municipioParaRender = (
  ayuntamiento: AyuntamientoLeido,
): EntradaDeRender["municipio"] =>
  ayuntamiento.escudo
    ? { nombre: ayuntamiento.nombre, escudo: ayuntamiento.escudo }
    : { nombre: ayuntamiento.nombre };

/**
 * `pdfDeConstancia`: acredita, compone y delega (design.md de
 * `constancias-oficios`, seccion 11). Sin guarda de rol propia -mismo
 * criterio que `constanciaPorId`-: leer un PDF no es una operacion distinta
 * de leer la constancia que representa, y `constanciaPorId` tampoco la
 * tiene.
 *
 * Todo corre dentro de **un** `withTenant`: la constancia, la reimpresion
 * -si se pide- y el ayuntamiento se leen de la misma transaccion, asi que
 * ninguna de las tres puede resolver contra un tenant distinto de las
 * otras.
 */
export function crearPdfDeConstancia(
  repositorio: RepositorioDeConstancias,
  lecturaDeAyuntamiento: LecturaDeAyuntamiento,
  renderizador: RenderizadorDeConstancias,
) {
  return async function pdfDeConstancia(
    entrada: EntradaDePdf,
    contexto: ContextoActual,
  ): Promise<SalidaDePdf> {
    return withTenant(contexto.ayuntamientoId, async (tx) => {
      const constancia = await repositorio.buscarPorId(tx, entrada.id);
      if (!constancia) throw new NoEncontradoError();

      const reimpresion = await verificarReimpresion(
        repositorio,
        tx,
        entrada.reimpresionId,
        constancia.id,
      );
      const ayuntamiento = await municipioDe(
        lecturaDeAyuntamiento,
        tx,
        contexto.ayuntamientoId,
      );

      const urlDeValidacion = `https://${ayuntamiento.subdominio}.${dominioBase()}/validar/${constancia.folio}?c=${constancia.codigoVerificacion}`;

      const bytes = await renderizador.aPdf({
        folio: constancia.folio,
        tipo: constancia.tipo,
        plantillaVersion: constancia.plantillaVersion,
        datos: esquemaDeSnapshot.parse(constancia.datos),
        municipio: municipioParaRender(ayuntamiento),
        urlDeValidacion,
        reimpresion,
      });

      return { bytes, folio: constancia.folio };
    });
  };
}
