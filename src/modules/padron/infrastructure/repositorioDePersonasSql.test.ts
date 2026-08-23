import { describe, expect, it, vi } from "vitest";
import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import type { PersonaParaGuardar } from "../application/puertos";
import type { PersonaId } from "../domain";
import { normalizarParaBusqueda } from "../domain";
import { repositorioDePersonasSql } from "./repositorioDePersonasSql";

/**
 * `tx` fabricado a mano, mismo patron que `catalogoDeAbreviaturasSql.test.ts`:
 * alcanza con la parte de la cadena de Drizzle que el adaptador realmente
 * usa, y corre sin Postgres.
 *
 * Lo que este archivo prueba es la costura de design.md seccion 5: que
 * `nombreNormalizado` sale de `normalizarParaBusqueda` (la misma funcion de
 * dominio) y no de una copia. No prueba el resto del adaptador —
 * `buscarPorId`, `marcarBaja`, `listar`, `buscar`— porque esos no tienen
 * decision de negocio que un mock pueda ejercitar mejor que la integracion
 * real (design.md seccion 10). `buscar` en particular se probo con un mock
 * que reconstruia la forma interna de `queryChunks` de Drizzle para afirmar
 * el SQL exacto: se rompia con cualquier cambio de esa libreria sin que el
 * comportamiento hubiera cambiado, y lo que de verdad importa —que `%` sea
 * sargable, que la cadena llegue sin re-normalizar— ya lo prueba
 * `buscarPersonas.integration.test.ts` contra Postgres real. Encontrado por
 * la revision del PR.
 */

const txDeInsercion = () => {
  const values = vi.fn().mockResolvedValue(undefined);
  const insert = vi.fn().mockReturnValue({ values });

  return { tx: { insert } as unknown as TransaccionTenant, values };
};

const txDeActualizacion = () => {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn().mockReturnValue({ where });
  const update = vi.fn().mockReturnValue({ set });

  return { tx: { update } as unknown as TransaccionTenant, set, where };
};

const persona: PersonaParaGuardar = {
  nombres: "Maria Guadalupe",
  primerApellido: "Kumul",
  segundoApellido: "Pech",
  curp: null,
};

const expansiones = new Map([["gpe", "guadalupe"]]);

describe("repositorioDePersonasSql", () => {
  it("guardar escribe nombreNormalizado calculado con normalizarParaBusqueda", async () => {
    const { tx, values } = txDeInsercion();
    const ayuntamientoId = "motul" as AyuntamientoId;

    await repositorioDePersonasSql.guardar(tx, {
      id: "persona-1" as PersonaId,
      ayuntamientoId,
      persona,
      expansiones,
    });

    const esperado = normalizarParaBusqueda(
      "Maria Guadalupe Kumul Pech",
      expansiones,
    );

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "persona-1",
        ayuntamientoId,
        nombres: persona.nombres,
        primerApellido: persona.primerApellido,
        segundoApellido: persona.segundoApellido,
        curp: persona.curp,
        nombreNormalizado: esperado,
      }),
    );
  });

  it("actualizar recalcula nombreNormalizado sobre los datos nuevos", async () => {
    const { tx, set, where } = txDeActualizacion();
    const editada: PersonaParaGuardar = {
      ...persona,
      primerApellido: "Canul",
    };

    await repositorioDePersonasSql.actualizar(tx, {
      id: "persona-1" as PersonaId,
      persona: editada,
      expansiones,
    });

    const esperado = normalizarParaBusqueda(
      "Maria Guadalupe Canul Pech",
      expansiones,
    );

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        primerApellido: "Canul",
        nombreNormalizado: esperado,
      }),
    );
    expect(where).toHaveBeenCalled();
  });
});
