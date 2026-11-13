import type { PorcionExportable } from "@/shared/exportacion/exportar";
import {
  configuracionDeDocumentos,
  constancias,
  foliosDeDocumentos,
  reimpresiones,
} from "./infrastructure/esquema";

/**
 * Lo que `constancias` aporta al exportador de plataforma (design.md
 * seccion 8, rebanada 8; `reimpresiones`, `configuracion_de_documentos` y
 * `folios_de_documentos` entran con S2 de
 * `odd/tasks/exportacion-de-datos.md`). Vive en su propio archivo junto con
 * la porcion original, que estaba en `composicion.ts`; ese archivo la
 * reexporta, asi que nadie cambia de import.
 *
 * Columnas explicitas, nunca `select()` pelado. `constancias` incluye
 * `codigoVerificacion` en claro: el archivo municipal tiene que poder
 * reconstruir el documento, y la exportacion ya sale detras de
 * `puedeExportar` con traza en bitacora (design.md seccion 8). Incluye
 * `personaId` crudo -es un uuid, `personas` ya va en el mismo archivo, y
 * esconderlo dejaria un registro emitido que no se puede vincular a su
 * titular-. Excluye `ayuntamientoId` -redundante, mismo criterio que
 * `porcionDePadron`- y el jsonb `datos` completo: no hay decision de que
 * columnas de el exportar (design.md, pregunta abierta de la seccion 20),
 * asi que esta rebanada no lo saca entero sin esa decision.
 *
 * `configuracion_de_documentos` es el caso opuesto y por eso **si** exporta
 * su jsonb `datos`: ahi `datos` es el bloque de firma -firmante, cargo y
 * leyenda de pie- y es toda la fila; sin el no hay nada que entregar.
 * `folios_de_documentos` sale sin `id` porque no lo tiene: su identidad es
 * la tripleta `(municipio, tipo, anio)`, y `ultimoConsecutivo` es lo que
 * deja a quien reciba los datos seguir la numeracion sin repetirla.
 */
export const porcionesDeConstancias: readonly PorcionExportable[] = [
  {
    nombre: "constancias",
    leer: (tx) =>
      tx
        .select({
          id: constancias.id,
          tipo: constancias.tipo,
          folio: constancias.folio,
          anio: constancias.anio,
          consecutivo: constancias.consecutivo,
          codigoVerificacion: constancias.codigoVerificacion,
          personaId: constancias.personaId,
          plantillaVersion: constancias.plantillaVersion,
          emitidaPorUsuarioId: constancias.emitidaPorUsuarioId,
          emitidaEn: constancias.emitidaEn,
          canceladaEn: constancias.canceladaEn,
          canceladaPorUsuarioId: constancias.canceladaPorUsuarioId,
          motivoCancelacion: constancias.motivoCancelacion,
        })
        .from(constancias),
  },
  {
    nombre: "reimpresiones",
    leer: (tx) =>
      tx
        .select({
          id: reimpresiones.id,
          constanciaId: reimpresiones.constanciaId,
          usuarioId: reimpresiones.usuarioId,
          motivo: reimpresiones.motivo,
          ocurridoEn: reimpresiones.ocurridoEn,
        })
        .from(reimpresiones),
  },
  {
    nombre: "configuracion_de_documentos",
    leer: (tx) =>
      tx
        .select({ datos: configuracionDeDocumentos.datos })
        .from(configuracionDeDocumentos),
  },
  {
    nombre: "folios_de_documentos",
    leer: (tx) =>
      tx
        .select({
          tipo: foliosDeDocumentos.tipo,
          anio: foliosDeDocumentos.anio,
          ultimoConsecutivo: foliosDeDocumentos.ultimoConsecutivo,
        })
        .from(foliosDeDocumentos),
  },
];
