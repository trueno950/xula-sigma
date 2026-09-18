/**
 * "Ver mas" (`design.md`, seccion "Paginacion") sin `COUNT(*)`: quien llama
 * le pide al repositorio `limite + 1` filas. Si vuelven de mas, la de mas
 * nunca se muestra -solo confirma que hay una siguiente pagina- y se
 * recorta antes de llegar a la pantalla.
 *
 * Duplicada de `reportes/domain/paginacion.ts` y no importada de alli: un
 * modulo no importa de otro (`AGENTS.md`, capas). Funcion pura y generica
 * porque el mismo calculo aplica igual a cualquier registro paginado.
 */
export function resolverPagina<T>(
  filas: readonly T[],
  limite: number,
): { readonly filas: readonly T[]; readonly hayMas: boolean } {
  exigirLimiteValido(limite);

  if (filas.length > limite) {
    return { filas: filas.slice(0, limite), hayMas: true };
  }

  return { filas, hayMas: false };
}

/**
 * Se exporta aparte porque quien pagina tiene que rechazar el limite *antes*
 * de ir a la base: el repositorio recibe `limite + 1` y `resolverPagina`
 * corre recien con las filas ya traidas, asi que un limite invalido llegaria
 * al `LIMIT` de Postgres si solo se validara aca adentro.
 *
 * Sin esta guarda un limite negativo perdia filas en silencio:
 * `filas.length > -1` siempre es cierto, y `slice(0, -1)` cuenta desde el
 * final, asi que devolvia la pagina sin su ultima fila y encima con
 * `hayMas: true`. Las copias de `reportes`, `padron` y `constancias` siguen
 * sin ella.
 */
export function exigirLimiteValido(limite: number): void {
  if (!Number.isInteger(limite) || limite < 1) {
    throw new Error("limite invalido: se esperaba un entero positivo.");
  }
}
