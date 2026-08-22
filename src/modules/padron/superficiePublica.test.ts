import { isTable } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import * as superficie from "./index";

/**
 * Por que el barrel no puede exportar un objeto de tabla, en un solo lugar
 * — el resto del modulo apunta aca.
 *
 * `modulo-no-importa-interior-de-otro` (`.dependency-cruiser.cjs`) bloquea
 * que otro modulo importe `padron/infrastructure/esquema`, pero su
 * `pathNot` deja pasar el `index.ts` ajeno a proposito. Entonces la regla
 * no alcanza sola: el dia que el barrel reexporte `infrastructure`,
 * depcruise sigue en verde y `.from(personas)` desde otro modulo pasa a
 * ser legal. Lo que lo impide no es la regla, es que el objeto de tabla no
 * sea alcanzable — Drizzle lo exige para `from` y `leftJoin`.
 *
 * Un join crudo se saltea la resolucion de fusiones de la rebanada 4 y
 * pierde historiales sin fallar. Por eso esto se fija con un test y no con
 * un comentario pidiendo que nadie lo haga.
 */
describe("superficie publica de padron", () => {
  it("no exporta ningun objeto de tabla Drizzle", () => {
    const tablas = Object.values(superficie).filter((valor) => isTable(valor));

    expect(tablas).toHaveLength(0);
  });
});
