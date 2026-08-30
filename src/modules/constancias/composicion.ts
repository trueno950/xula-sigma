import type { PorcionExportable } from "@/shared/exportacion/exportar";
import {
  crearCancelarConstancia,
  crearConfigurarDocumentos,
  crearConstanciaPorId,
  crearDocumentosDelAyuntamiento,
  crearEmitirConstancia,
  crearListarConstancias,
  crearPdfDeConstancia,
  crearReimprimirConstancia,
  crearValidarFolio,
} from "./application";
import {
  contadorDeFoliosSql,
  crearLectorDeDireccionesPorTerritorio,
  crearLectorDeTitularesPorPadron,
  lectorDeAyuntamientoSql,
  renderizadorReactPdf,
  repositorioDeConstanciasSql,
  repositorioDeDocumentosSql,
} from "./infrastructure";
import { constancias } from "./infrastructure/esquema";

/**
 * Raiz de composicion del modulo: une la fabrica de cada caso de uso con
 * los adaptadores reales. Vive fuera de las cuatro capas y es el unico
 * archivo del modulo que ninguna regla de `.dependency-cruiser.cjs` vigila
 * (design.md seccion 1, precedente `marca/composicion.ts`) — la contencion
 * es que no tenga nada que vigilar: solo cableado, cero condicionales, cero
 * `await`.
 *
 * No importa `./ui` ni `./index`: cualquiera de los dos cierra un ciclo
 * (`sin-ciclos`), porque `./ui` importa la Server Action que a su vez
 * importa este archivo.
 */
export const configurarDocumentos = crearConfigurarDocumentos(
  repositorioDeDocumentosSql,
);
export const documentosDelAyuntamiento = crearDocumentosDelAyuntamiento(
  repositorioDeDocumentosSql,
);
export const emitirConstancia = crearEmitirConstancia(
  repositorioDeConstanciasSql,
  contadorDeFoliosSql,
  repositorioDeDocumentosSql,
  crearLectorDeTitularesPorPadron,
  crearLectorDeDireccionesPorTerritorio,
);
export const constanciaPorId = crearConstanciaPorId(
  repositorioDeConstanciasSql,
);
export const listarConstancias = crearListarConstancias(
  repositorioDeConstanciasSql,
);
export const pdfDeConstancia = crearPdfDeConstancia(
  repositorioDeConstanciasSql,
  lectorDeAyuntamientoSql,
  renderizadorReactPdf,
);
export const reimprimirConstancia = crearReimprimirConstancia(
  repositorioDeConstanciasSql,
);
export const cancelarConstancia = crearCancelarConstancia(
  repositorioDeConstanciasSql,
);
/**
 * Publico, sin `ContextoActual`: `src/app/validar/[folio]/page.tsx` la llama
 * sin sesion (design.md de `constancias-oficios`, secciones 7 y 8).
 */
export const validarFolio = crearValidarFolio(repositorioDeConstanciasSql);

/**
 * Porcion que `constancias` aporta al exportador de plataforma (design.md
 * seccion 8, rebanada 8). Se construye aca -no en `infrastructure`- mismo
 * criterio que `porcionDePadron` y `porcionesDeTerritorio`.
 *
 * Columnas explicitas, nunca `select()` pelado. Incluye `codigoVerificacion`
 * en claro: el archivo municipal tiene que poder reconstruir el documento, y
 * la exportacion ya sale detras de `puedeExportar` con traza en bitacora
 * (design.md seccion 8). Incluye `personaId` crudo -es un uuid, `personas`
 * ya va en el mismo archivo, y esconderlo dejaria un registro emitido que no
 * se puede vincular a su titular-. Excluye `ayuntamientoId` -redundante,
 * mismo criterio que `porcionDePadron`- y el jsonb `datos` completo: no hay
 * decision de que columnas de el exportar (design.md, pregunta abierta de
 * la seccion 20), asi que esta rebanada no lo saca entero sin esa decision.
 */
export const porcionesDeConstancias: readonly [PorcionExportable] = [
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
];
