import type { TipoDeDocumento } from "../domain";
import type { Snapshot } from "./validacionDeSnapshot";

/**
 * Lo que `pdfDeConstancia` le entrega al renderizador (design.md de
 * `constancias-oficios`, seccion 11). `plantillaVersion` viaja como
 * `string` y no como una union cerrada: esa union solo la conoce
 * `infrastructure/plantillas/registro.ts` -que `application` no puede
 * importar (`application-no-importa-infra-ni-ui`)-, y es ese registro quien
 * decide si la version es conocida, lanzando `PlantillaDesconocidaError` si
 * no.
 *
 * `municipio.escudo` es la URL publica del escudo -no los bytes-: se lee
 * viva de `ayuntamientos.marca` en cada render (corregido sobre la lectura
 * obvia de la decision 12, design.md seccion 4, tabla de decisiones
 * corregidas), y es el renderizador quien la descarga.
 */
export type EntradaDeRender = {
  folio: string;
  tipo: TipoDeDocumento;
  plantillaVersion: string;
  datos: Snapshot;
  municipio: { nombre: string; escudo?: string };
  urlDeValidacion: string;
  /**
   * Acredita la marca de agua; nunca la elige quien llama. `pdfDeConstancia`
   * es el unico que la pone en `true`, y solo despues de verificar que la
   * reimpresion existe y es de esta constancia (seccion 11: "un parametro
   * inventado no produce una hoja con marca de agua").
   */
  reimpresion: boolean;
};

/**
 * Puerto del render de PDF. Mismo criterio que `AlmacenDeAssets`
 * (`modules/marca/application/puertos.ts`): el caso de uso se prueba con un
 * renderizador falso, sin generar un PDF real en cada test.
 */
export type RenderizadorDeConstancias = {
  aPdf(entrada: EntradaDeRender): Promise<Uint8Array>;
};
