/**
 * La regla de "cual residencia es la vigente" hoy vive en prosa en
 * `application/puertosDeResidencias.ts` y en
 * `application/historialDeResidencias.ts`, y la aplica cada consumidor a
 * mano (design.md seccion 7). Se convierte en una funcion de dominio.
 *
 * `find` y no un `sort`: `historialDe` **ya devuelve** en el orden
 * `desdeEn DESC, creadoEn DESC` -es parte de su contrato-, asi que
 * reordenar aca seria una segunda copia del criterio. Un arreglo que no
 * respete ese orden no se corrige aca: es responsabilidad de quien lo
 * produjo.
 */
export const vigenteDe = <R extends { hastaEn: string | null }>(
  historial: readonly R[],
): R | null => historial.find((r) => r.hastaEn === null) ?? null;
