import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";

const buscarPersonasMock = vi.hoisted(() => vi.fn());

vi.mock("@/modules/padron", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/padron")>()),
  buscarPersonas: buscarPersonasMock,
}));

const { crearBuscadorDeTitularesPorPadron } = await import(
  "./lectorDeTitularesPorPadron"
);

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "OPERADOR" },
  origen: "web",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("crearBuscadorDeTitularesPorPadron", () => {
  /**
   * El adaptador no reimplementa la busqueda: llama a la del padron con la
   * cadena tal cual y el tope que le pide el caso de uso. Si compusiera su
   * propia consulta, el buscador de la emision encontraria otras personas
   * que el padron para la misma cadena.
   */
  it("busca con la cadena y el tope que recibe, en el padron", async () => {
    buscarPersonasMock.mockResolvedValue({ personas: [], hayMas: false });

    await crearBuscadorDeTitularesPorPadron(contexto).buscar("gpe kumul", 10);

    expect(buscarPersonasMock).toHaveBeenCalledWith("gpe kumul", contexto, {
      limite: 10,
    });
  });

  it("traduce cada persona a un candidato con su nombre completo y su CURP", async () => {
    buscarPersonasMock.mockResolvedValue({
      personas: [
        {
          id: "persona-1",
          nombres: "Guadalupe",
          primerApellido: "Kumul",
          segundoApellido: null,
          curp: "KUPE800101MYNXXX01",
          bajaEn: null,
        },
      ],
      hayMas: true,
    });

    const resultado = await crearBuscadorDeTitularesPorPadron(contexto).buscar(
      "gpe",
      10,
    );

    expect(resultado).toEqual({
      candidatos: [
        {
          id: "persona-1",
          nombreCompleto: "Guadalupe Kumul",
          curp: "KUPE800101MYNXXX01",
          bajaEn: null,
        },
      ],
      hayMas: true,
    });
  });
});
