import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import type {
  RepositorioDeResidencias,
  ResidenciaGuardada,
} from "../application/puertosDeResidencias";
import {
  comoCalleId,
  comoDomicilioId,
  comoLugarId,
  comoResidenciaId,
  MudanzaConcurrenteError,
} from "../domain";
import { domicilios, residencias } from "./esquema";
import { violaRestriccionUnica } from "./violacionDeRestriccion";

type FilaDeHistorial = {
  id: string;
  personaId: string;
  domicilioId: string;
  desdeEn: string;
  hastaEn: string | null;
  creadoEn: Date;
  domicilioNumero: string | null;
  domicilioCalleId: string;
  domicilioLugarId: string;
};

const aResidenciaGuardada = (fila: FilaDeHistorial): ResidenciaGuardada => ({
  id: comoResidenciaId(fila.id),
  personaId: fila.personaId,
  domicilioId: comoDomicilioId(fila.domicilioId),
  desdeEn: fila.desdeEn,
  hastaEn: fila.hastaEn,
  creadoEn: fila.creadoEn,
  domicilio: {
    calleId: comoCalleId(fila.domicilioCalleId),
    lugarId: comoLugarId(fila.domicilioLugarId),
    numero: fila.domicilioNumero,
  },
});

/**
 * Implementacion real de `RepositorioDeResidencias` contra `residencias`.
 * Ninguna consulta de este archivo escribe una plantilla `sql\`…\`` que
 * mencione `persona_id` o `residencias`: todas usan el builder de Drizzle,
 * el mismo motivo que `esquema.ts` (design.md seccion 5, la trampa de
 * `identidadPorPuerto.test.ts`).
 */
export const repositorioDeResidenciasSql: RepositorioDeResidencias = {
  async cerrarAbiertas(tx, identidades, hastaEn) {
    if (identidades.length === 0) return [];

    const filas = await tx
      .update(residencias)
      .set({ hastaEn })
      .where(
        and(
          inArray(residencias.personaId, identidades),
          isNull(residencias.hastaEn),
        ),
      )
      .returning({ id: residencias.id });

    return filas.map((fila) => comoResidenciaId(fila.id));
  },

  async abrir(tx, { ayuntamientoId, personaId, domicilioId, desdeEn }) {
    try {
      const [fila] = await tx
        .insert(residencias)
        .values({ ayuntamientoId, personaId, domicilioId, desdeEn })
        .returning({ id: residencias.id });

      return comoResidenciaId(fila!.id);
    } catch (error) {
      if (violaRestriccionUnica(error, "residencias_una_abierta_idx")) {
        throw new MudanzaConcurrenteError();
      }
      throw error;
    }
  },

  /**
   * `identidades` de una sola persona sin fusionar trae un unico id; el
   * `IN` cubre igual el caso fusionado sin dos consultas. Orden
   * `desdeEn DESC, creadoEn DESC`: `creadoEn` desempata cuando dos
   * residencias abiertas comparten `desdeEn` (design.md seccion 8).
   */
  async historialDe(tx, identidades) {
    if (identidades.length === 0) return [];

    const filas = await tx
      .select({
        id: residencias.id,
        personaId: residencias.personaId,
        domicilioId: residencias.domicilioId,
        desdeEn: residencias.desdeEn,
        hastaEn: residencias.hastaEn,
        creadoEn: residencias.creadoEn,
        domicilioNumero: domicilios.numero,
        domicilioCalleId: domicilios.calleId,
        domicilioLugarId: domicilios.lugarId,
      })
      .from(residencias)
      .innerJoin(domicilios, eq(domicilios.id, residencias.domicilioId))
      .where(inArray(residencias.personaId, identidades))
      .orderBy(desc(residencias.desdeEn), desc(residencias.creadoEn));

    return filas.map(aResidenciaGuardada);
  },

  /** Por que `domicilioIds` ya viene resuelto: `puertosDeResidencias.ts`. */
  async residentesDe(tx, domicilioIds) {
    if (domicilioIds.length === 0) return [];

    const filas = await tx
      .selectDistinct({ personaId: residencias.personaId })
      .from(residencias)
      .where(
        and(
          inArray(residencias.domicilioId, domicilioIds),
          isNull(residencias.hastaEn),
        ),
      );

    return filas.map((fila) => fila.personaId);
  },
};
