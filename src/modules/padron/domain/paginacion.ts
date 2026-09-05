/**
 * "Ver mas" (`design.md`, seccion "Paginacion") sin `COUNT(*)`: quien llama
 * le pide al repositorio `limite + 1` filas. Si vuelven de mas, la de mas
 * nunca se muestra -solo confirma que hay una siguiente pagina- y se
 * recorta antes de llegar a la pantalla.
 *
 * Funcion pura y generica (sin `PersonaGuardada` en la firma) porque el
 * mismo calculo aplica igual a `listar` que a `buscar`: la decision no
 * depende de que se esta paginando.
 */
export function resolverPagina<T>(
  filas: readonly T[],
  limite: number,
): { readonly filas: readonly T[]; readonly hayMas: boolean } {
  if (filas.length > limite) {
    return { filas: filas.slice(0, limite), hayMas: true };
  }

  return { filas, hayMas: false };
}
