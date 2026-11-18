import { describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import {
  type BusquedaDeTitulares,
  crearBuscarTitulares,
  LIMITE_DE_TITULARES,
} from "./buscarTitulares";

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "OPERADOR" },
  origen: "web",
};

const busquedaCon = (
  buscados: Awaited<ReturnType<BusquedaDeTitulares["buscar"]>>,
) => {
  const buscar = vi.fn().mockResolvedValue(buscados);

  return { busqueda: { buscar } satisfies BusquedaDeTitulares, buscar };
};

const crear = (busqueda: BusquedaDeTitulares) =>
  crearBuscarTitulares(() => busqueda);

describe("buscarTitulares", () => {
  it("busca en el padron con la cadena recortada y el tope del buscador", async () => {
    const { busqueda, buscar } = busquedaCon({ candidatos: [], hayMas: false });
    const buscarTitulares = crear(busqueda);

    await buscarTitulares("  gpe kumul ", contexto);

    expect(buscar).toHaveBeenCalledWith("gpe kumul", LIMITE_DE_TITULARES);
  });

  it("devuelve el nombre y la CURP de cada titular, sin su fecha de baja", async () => {
    const { busqueda } = busquedaCon({
      candidatos: [
        {
          id: "persona-1",
          nombreCompleto: "Guadalupe Kumul Poot",
          curp: "KUPE800101MYNXXX01",
          bajaEn: null,
        },
      ],
      hayMas: false,
    });

    const resultado = await crear(busqueda)("gpe", contexto);

    expect(resultado.titulares).toEqual([
      {
        id: "persona-1",
        nombreCompleto: "Guadalupe Kumul Poot",
        curp: "KUPE800101MYNXXX01",
      },
    ]);
  });

  /**
   * S4: la constancia de una persona dada de baja no se puede emitir
   * (`TitularDadoDeBajaError`), asi que ofrecerla en la busqueda es ofrecer
   * un camino que termina en error despues de elegirla.
   */
  it("no ofrece a quien esta dado de baja en el padron", async () => {
    const { busqueda } = busquedaCon({
      candidatos: [
        {
          id: "persona-1",
          nombreCompleto: "Guadalupe Kumul Poot",
          curp: null,
          bajaEn: new Date("2026-01-01T00:00:00Z"),
        },
      ],
      hayMas: false,
    });

    const resultado = await crear(busqueda)("gpe", contexto);

    expect(resultado.titulares).toEqual([]);
  });

  /** Una cadena vacia es la pantalla inicial, no una busqueda del padron entero. */
  it("sin cadena no consulta y no devuelve a nadie", async () => {
    const { busqueda, buscar } = busquedaCon({
      candidatos: [
        {
          id: "persona-1",
          nombreCompleto: "Guadalupe Kumul Poot",
          curp: null,
          bajaEn: null,
        },
      ],
      hayMas: false,
    });

    const resultado = await crear(busqueda)("   ", contexto);

    expect(buscar).not.toHaveBeenCalled();
    expect(resultado).toEqual({ titulares: [], hayMas: false });
  });

  it("conserva el aviso de que hay mas resultados de los que caben", async () => {
    const { busqueda } = busquedaCon({ candidatos: [], hayMas: true });

    expect((await crear(busqueda)("poot", contexto)).hayMas).toBe(true);
  });
});
