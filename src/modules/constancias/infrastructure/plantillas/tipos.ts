import type { ReactElement } from "react";
import type { Snapshot } from "../../application/validacionDeSnapshot";

/**
 * Lo que cualquier componente de plantilla acepta. `municipio.escudo` ya
 * llega como `Buffer` -a diferencia de `EntradaDeRender.municipio.escudo`,
 * que es la URL-: `renderizadorReactPdf.ts` es quien la descarga, antes de
 * construir estas props (design.md de `constancias-oficios`, seccion 11).
 *
 * Vive en su propio archivo -no en `registro.ts` ni en la plantilla misma-
 * porque las dos lo necesitan: `ConstanciaDeVecindadV1.tsx` para tipar sus
 * props, `registro.ts` para tipar `PLANTILLAS`. Cualquiera de los otros dos
 * lugares habria cerrado un ciclo (`sin-ciclos`): `registro.ts` ya importa
 * el componente, y el componente habria tenido que importar el registro de
 * vuelta.
 */
export type PropsDePlantilla = {
  folio: string;
  datos: Snapshot;
  municipio: { nombre: string; escudo?: Buffer };
  qrDataUrl: string;
  urlDeValidacion: string;
  reimpresion: boolean;
};

export type ComponenteDePlantilla = (props: PropsDePlantilla) => ReactElement;
