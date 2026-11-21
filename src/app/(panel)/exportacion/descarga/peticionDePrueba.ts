/**
 * La peticion de los tests del borde de la descarga.
 *
 * Por defecto **no es una navegacion del navegador**: sin `text/html` en el
 * acepto, el borde contesta con su estado y su mensaje, que es lo que afirman
 * `route.test.ts` y los tests de integracion. La navegacion real —la del
 * enlace del panel, la que no puede recibir `text/plain`— tiene su propio caso
 * en `route.test.ts` (S13).
 */
export const peticionDeDescarga = (acepta = "*/*"): Request =>
  new Request("https://motul.xulasigma.mx/exportacion/descarga", {
    headers: { accept: acepta },
  });
