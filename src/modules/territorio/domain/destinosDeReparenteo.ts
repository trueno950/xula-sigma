import type { LugarId } from "./identificadores";
import { puedeContener, type TipoDeLugar } from "./tipoDeLugar";

/** Lo minimo que hace falta para decidir si un lugar puede recibir a otro. */
export type LugarComoDestino = {
  readonly id: LugarId;
  readonly tipo: TipoDeLugar;
};

/**
 * A que lugares del municipio se puede mover este, en el orden del catalogo.
 *
 * El filtro es exactamente el que `reparentearLugar` vuelve a aplicar
 * —`puedeContener(padre, hijo)` mas la fila misma, que `lugares_sin_autopadre`
 * prohibe—: esconder una opcion no es la regla, es no ofrecer un camino que
 * termina en `JerarquiaInvalidaError` despues de enviar (`05-seguridad.md`
 * seccion 6).
 *
 * No hace falta excluir a los descendientes: toda arista sube el rango, asi
 * que ninguno puede contener a su ancestro y `puedeContener` ya los descarta
 * -consecuencia (3) de `tipoDeLugar.ts`-.
 */
export const destinosDeReparenteo = <T extends LugarComoDestino>(
  lugar: LugarComoDestino,
  catalogo: readonly T[],
): readonly T[] =>
  catalogo.filter(
    (candidato) =>
      candidato.id !== lugar.id && puedeContener(candidato.tipo, lugar.tipo),
  );
