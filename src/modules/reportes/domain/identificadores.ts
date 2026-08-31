/**
 * `ReporteId` y `MovimientoId`, noveno y decimo lugar del mismo
 * `PATRON_UUID` del repo (design.md seccion 3, `territorio/domain/
 * identificadores.ts`). Se repite y no se importa: el dominio no importa
 * nada.
 */

declare const marca: unique symbol;

type Identificador<N extends string> = string & { readonly [marca]: N };

export type ReporteId = Identificador<"ReporteId">;
export type MovimientoId = Identificador<"MovimientoId">;

const PATRON_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const fabricaDeConstructor =
  <N extends string>(nombre: N) =>
  (valor: string): Identificador<N> => {
    if (!PATRON_UUID.test(valor)) {
      throw new Error(`${nombre} invalido: se esperaba un UUID.`);
    }
    return valor as Identificador<N>;
  };

export const comoReporteId = fabricaDeConstructor("ReporteId");
export const comoMovimientoId = fabricaDeConstructor("MovimientoId");
