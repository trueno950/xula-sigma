import type { ContextoActual } from "@/shared/auth/contexto";
import { NoEncontradoError } from "@/shared/lib/errores";
import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import { DOMINIO_BASE_POR_DEFECTO } from "@/shared/tenancy/subdominio";
import {
  type TransaccionTenant,
  withTenant,
} from "@/shared/tenancy/withTenant";
import {
  type ConstanciaId,
  comoReimpresionId,
  type ReimpresionId,
} from "../domain";
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
 * El mismo `DOMINIO_BASE` que resuelve el tenant en `proxy.ts`, y el mismo
 * defecto.
 *
 * Antes eran dos `?? "localhost"` separados, con un comentario que decia
 * que eran iguales. Cuando el del proxy paso a `xula.localhost` -por que,
 * en `subdominio.ts`- este se habria quedado atras sin que nada fallara, y
 * la URL de validacion impresa en una constancia apuntaria a un dominio
 * que no sirve al municipio. El papel no se puede reimprimir.
 */
const dominioBase = () => process.env.DOMINIO_BASE ?? DOMINIO_BASE_POR_DEFECTO;

type ContextoDeAcreditacion = {
  repositorio: RepositorioDeConstancias;
  tx: TransaccionTenant;
  constanciaId: ConstanciaId;
};

/**
 * `true` solo si `reimpresionIdCrudo` acredita: existe **y** es de
 * `constanciaId` (design.md de `constancias-oficios`, seccion 11, FK
 * compuesto). Un `reimpresionId` ausente es simplemente "no es una
 * reimpresion" -`false`, sin lanzar-; uno presente que no acredita lanza
 * `NoEncontradoError` antes de que el llamador toque el renderizador.
 */
async function verificarReimpresion(
  contexto: ContextoDeAcreditacion,
  reimpresionIdCrudo: string | undefined,
): Promise<boolean> {
  if (reimpresionIdCrudo === undefined) return false;

  const acreditada = await intentarAcreditar(contexto, reimpresionIdCrudo);
  if (!acreditada) throw new NoEncontradoError();

  return true;
}

/**
 * El `try` cubre unicamente la construccion **sincronica** de
 * `comoReimpresionId`: un `reimpresionId` sin forma de UUID lanza ahi y cae
 * en la misma rama que "no existe" -`false`-. La consulta a
 * `existeReimpresion` queda fuera de ese `try`: un fallo real de
 * infraestructura (conexion perdida, timeout) debe propagarse al 500
 * generico de `conBorde`, no disfrazarse de "reimpresion no encontrada"
 * (hallazgo de GGA en la revision de esta rebanada).
 */
async function intentarAcreditar(
  { repositorio, tx, constanciaId }: ContextoDeAcreditacion,
  reimpresionIdCrudo: string,
): Promise<boolean> {
  let reimpresionId: ReimpresionId;
  try {
    reimpresionId = comoReimpresionId(reimpresionIdCrudo);
  } catch {
    return false;
  }

  return repositorio.existeReimpresion(tx, reimpresionId, constanciaId);
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
        { repositorio, tx, constanciaId: constancia.id },
        entrada.reimpresionId,
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
