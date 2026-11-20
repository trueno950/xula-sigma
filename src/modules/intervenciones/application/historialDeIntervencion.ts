import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import {
  type CambioDeIntervencion,
  cambiosEntre,
} from "./cambiosDeIntervencion";
import type {
  IntervencionGuardada,
  ValoresAnterioresDeIntervencion,
} from "./puertos";
import type {
  AutorDeIntervencion,
  LectorDeHistorialDeIntervenciones,
  RevisionGuardadaDeIntervencion,
} from "./puertosDeHistorial";

/** Una revision lista para pintar: que cambio, quien y cuando (S11). */
export type RevisionVisible = {
  id: string;
  titulo: string;
  /** Las lineas del «antes», ya redactadas: `cambiosDeIntervencion` decide. */
  cambios: readonly string[];
  ocurridoEn: Date;
  autor: AutorDeIntervencion | null;
};

export type HistorialDeIntervencion = {
  /** De la mas reciente a la mas vieja, como el artboard. */
  revisiones: readonly RevisionVisible[];
  /** Quien la registro, para el bloque de sistema de la ficha (S14). */
  registradaPor: AutorDeIntervencion | null;
};

const TITULO_SIN_CAMBIOS = "Corrección sin cambios";
const TITULO_VARIOS = "Varios datos corregidos";

const lineaSuelta = (cambio: CambioDeIntervencion): string =>
  cambio.anterior === null
    ? "Antes tenía otro valor."
    : `Antes decía «${cambio.anterior}».`;

/** Con varios cambios en el mismo renglon, cada linea nombra su campo. */
const lineaConCampo = (cambio: CambioDeIntervencion): string =>
  cambio.anterior === null
    ? `${cambio.etiqueta}: antes tenía otro valor.`
    : `${cambio.etiqueta}: antes decía «${cambio.anterior}».`;

const lineasDe = (
  cambios: readonly CambioDeIntervencion[],
): readonly string[] => {
  const [unico] = cambios;
  return unico && cambios.length === 1
    ? [lineaSuelta(unico)]
    : cambios.map(lineaConCampo);
};

const tituloDe = (cambios: readonly CambioDeIntervencion[]): string => {
  const [unico] = cambios;
  if (!unico) return TITULO_SIN_CAMBIOS;
  return cambios.length === 1 ? unico.titulo : TITULO_VARIOS;
};

const fotoDe = (
  intervencion: IntervencionGuardada,
): ValoresAnterioresDeIntervencion => ({
  tipo: intervencion.tipo,
  estado: intervencion.estado,
  fechaDeOcurrencia: intervencion.fechaDeOcurrencia,
  lugarId: intervencion.lugarId,
  calleId: intervencion.calleId,
  reporteId: intervencion.reporteId,
  descripcion: intervencion.descripcion,
});

/**
 * Cada revision guarda los valores ANTERIORES. Lo que quedo escrito despues
 * es lo que guarda la revision siguiente, y en la ultima, la intervencion
 * vigente: comparar contra eso es lo unico que permite decir «antes decia X»
 * sin inventar el despues. Por eso el historial se arma aca y no en la
 * pantalla, que solo tiene el historial.
 */
const revisionesVisibles = (
  revisiones: readonly RevisionGuardadaDeIntervencion[],
  vigente: ValoresAnterioresDeIntervencion,
): readonly RevisionVisible[] =>
  revisiones
    .map((revision, indice) => {
      const despues = revisiones[indice + 1]?.valoresAnteriores ?? vigente;
      const cambios = cambiosEntre(revision.valoresAnteriores, despues);

      return {
        id: revision.id,
        titulo: tituloDe(cambios),
        cambios: lineasDe(cambios),
        ocurridoEn: revision.ocurridoEn,
        autor: revision.autor,
      };
    })
    .reverse();

/**
 * El historial de cambios de una intervencion (S11). Sin guarda de rol: leer
 * no es escribir, mismo criterio que `intervencionPorId` y `historialDe` de
 * `reportes`.
 */
export function crearHistorialDeIntervencion(
  lector: LectorDeHistorialDeIntervenciones,
) {
  return async function historialDeIntervencion(
    intervencion: IntervencionGuardada,
    contexto: ContextoActual,
  ): Promise<HistorialDeIntervencion> {
    const { revisiones, registradaPor } = await withTenant(
      contexto.ayuntamientoId,
      (tx) =>
        lector.leer(tx, {
          intervencionId: intervencion.id,
          registradoPorUsuarioId: intervencion.registradoPorUsuarioId,
        }),
    );

    return {
      revisiones: revisionesVisibles(revisiones, fotoDe(intervencion)),
      registradaPor,
    };
  };
}
