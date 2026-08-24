/**
 * Cuarto, quinto y sexto lugar del mismo patron de `padron/domain/personaId.ts`
 * (design.md decision 2): "se duplica la primera vez, se aguanta la segunda,
 * se abstrae la tercera" (`AGENTS.md`, "Que NO es hallazgo"). Un solo
 * constructor generico en vez de cuatro cuerpos identicos.
 *
 * `PATRON_UUID` se repite en vez de importarse de `shared/tenancy`: el
 * dominio no importa nada (`docs/architecture/estructura.md`), ni siquiera
 * un regex. Tercer lugar del repo con la misma expresion
 * (`shared/tenancy/ayuntamientoId.ts`, `padron/domain/personaId.ts`, este).
 */

declare const marca: unique symbol;

type Identificador<N extends string> = string & { readonly [marca]: N };

export type LugarId = Identificador<"LugarId">;
export type CalleId = Identificador<"CalleId">;
export type DomicilioId = Identificador<"DomicilioId">;
export type ResidenciaId = Identificador<"ResidenciaId">;

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

export const comoLugarId = fabricaDeConstructor("LugarId");
export const comoCalleId = fabricaDeConstructor("CalleId");
export const comoDomicilioId = fabricaDeConstructor("DomicilioId");
export const comoResidenciaId = fabricaDeConstructor("ResidenciaId");
