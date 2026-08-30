/**
 * Septimo y octavo lugar del mismo patron de `padron/domain/personaId.ts`
 * (design.md decision 2): un solo constructor generico en vez de dos
 * cuerpos identicos.
 *
 * `PATRON_UUID` se repite en vez de importarse de `shared/tenancy`: el
 * dominio no importa nada (`docs/architecture/estructura.md`), ni siquiera
 * un regex.
 */

declare const marca: unique symbol;

type Identificador<N extends string> = string & { readonly [marca]: N };

export type ConstanciaId = Identificador<"ConstanciaId">;
export type ReimpresionId = Identificador<"ReimpresionId">;

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

export const comoConstanciaId = fabricaDeConstructor("ConstanciaId");
export const comoReimpresionId = fabricaDeConstructor("ReimpresionId");
