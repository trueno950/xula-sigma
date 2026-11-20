import type { CajaDeMapa, MarcadorDeMapa } from "../domain";

/**
 * Huella de lo que el mapa dibuja, para no volver a dibujarlo igual.
 *
 * `EstadoEnVivo` refresca la pantalla cada vez que el canal manda `resync` o
 * `actualizacion`, y el servidor entrega `marcadores` y `caja` en objetos
 * nuevos aunque el contenido sea identico. Sin esta huella, el efecto de
 * creacion del mapa tomaba cada refresco por un cambio de datos: desmontaba
 * el mapa -controlando la ventana abierta, el zoom y el arrastre de la
 * operadora- y lo volvia a armar, y entre el desmonte y el alta no habia
 * ningun control de zoom en el documento. El E2E de CI lo vio primero como
 * `Element is not visible` al hacer clic en «Zoom out».
 *
 * Se compara el contenido entero y no una lista de campos a proposito: un
 * campo nuevo en `MarcadorDeMapa` que no entre en la huella dejaria de
 * repintarse, y nadie se enteraria hasta que el mapa mostrara datos viejos.
 */
export function firmaDeVista({
  marcadores,
  caja,
}: {
  marcadores: readonly MarcadorDeMapa[];
  caja: CajaDeMapa | null;
}): string {
  return JSON.stringify([caja, marcadores]);
}
