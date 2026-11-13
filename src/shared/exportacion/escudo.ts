/**
 * El escudo del municipio dentro de la exportacion completa (S1 y S4 de
 * `exportacion-de-datos`).
 *
 * El puerto se declara aca, estructural y con `string` en vez de
 * `AyuntamientoId`, y no se importa el de `modules/marca`: `shared` no puede
 * importar modulos (`.dependency-cruiser.cjs#shared-no-importa-modulos`).
 * `LectorDeAssets` (`marca/application/puertos.ts`) encaja en esta forma sin
 * adaptador, y por eso `src/app` puede pasar el suyo sin traducir nada.
 *
 * La barrera de tenant no vive aca: la pone el adaptador, que deriva la clave
 * del almacenamiento con `claveTenantDesdeUrl`. Este archivo solo decide
 * *cuando* se lee, y eso lo fija `exportar.ts`.
 */
export type LectorDeEscudo = {
  leer(ayuntamientoId: string, url: string): Promise<Uint8Array>;
};

/**
 * Los bytes del escudo, o `undefined` si el municipio no tiene uno o si
 * nadie pidio leerlo.
 *
 * No se traga el fallo del almacenamiento: quien llama decide que hacer con
 * el (S1, en `exportar.ts`).
 */
export const escudoDe = (
  ayuntamientoId: string,
  url: string | undefined,
  lector: LectorDeEscudo | undefined,
): Promise<Uint8Array | undefined> =>
  url && lector ? lector.leer(ayuntamientoId, url) : Promise.resolve(undefined);
