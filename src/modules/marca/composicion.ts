import { crearCambiarEscudo } from "./application";
import { almacenR2, lectorR2, repositorioDeMarcaSql } from "./infrastructure";

/**
 * Raiz de composicion del modulo: une la fabrica del caso de uso con los
 * adaptadores reales. Vive fuera de las cuatro capas y es el unico archivo
 * del modulo que ninguna regla de `.dependency-cruiser.cjs` vigila
 * (design.md seccion 1) — la contencion es que no tenga nada que vigilar:
 * solo cableado, cero condicionales, cero `await`.
 *
 * No importa `./ui` ni `./index`: cualquiera de los dos cierra un ciclo
 * (`sin-ciclos`), porque `./ui` importa la Server Action que a su vez
 * importa este archivo.
 */
export const cambiarEscudo = crearCambiarEscudo(
  almacenR2,
  repositorioDeMarcaSql,
);

/**
 * El lector del escudo para la exportacion completa (S4 de
 * `exportacion-de-datos`). Se expone desde la raiz de composicion y no del
 * barril del modulo porque `src/app` no puede importar
 * `infrastructure/` (`app-no-importa-infrastructure` en
 * `.dependency-cruiser.cjs`): cablear adaptadores es justo lo que este
 * archivo hace.
 */
export const lectorDeEscudo = lectorR2;
