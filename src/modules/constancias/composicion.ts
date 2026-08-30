import {
  crearConfigurarDocumentos,
  crearConstanciaPorId,
  crearDocumentosDelAyuntamiento,
  crearEmitirConstancia,
  crearListarConstancias,
  crearPdfDeConstancia,
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
