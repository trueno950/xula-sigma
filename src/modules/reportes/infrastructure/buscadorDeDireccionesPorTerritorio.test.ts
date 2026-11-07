import { describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";

const registroDeDomiciliosMock = vi.hoisted(() => vi.fn());

vi.mock("@/modules/territorio", async (importarOriginal) => ({
  ...(await importarOriginal<typeof import("@/modules/territorio")>()),
  registroDeDomicilios: registroDeDomiciliosMock,
}));

const { buscadorDeDireccionesPorTerritorio } = await import(
  "./buscadorDeDireccionesPorTerritorio"
);

const contexto = {
  ayuntamientoId: "motul",
  usuario: { id: "usuario-1", rol: "OPERADOR" },
  origen: "web",
} as unknown as ContextoActual;

const fila = {
  id: "11111111-1111-4111-8111-111111111111",
  calle: "Calle 20",
  numero: "42-B",
  lugar: "Colonia Centro",
  lugarId: "22222222-2222-4222-8222-222222222222",
};

describe("buscadorDeDireccionesPorTerritorio", () => {
  it("arma la etiqueta con el formato de Territorio, con la raiz cuando difiere del lugar", async () => {
    registroDeDomiciliosMock.mockResolvedValue({
      domicilios: [{ ...fila, raiz: "Buenavista" }],
      hayMas: false,
    });

    const { domicilios } = await buscadorDeDireccionesPorTerritorio.buscar(
      contexto,
      "Calle 20",
      15,
    );

    expect(domicilios[0]?.etiqueta).toBe(
      "Calle 20 #42-B, Colonia Centro, Buenavista",
    );
  });

  it("sin raiz conocida usa el lugar como raiz y no lo repite", async () => {
    registroDeDomiciliosMock.mockResolvedValue({
      domicilios: [{ ...fila, numero: null }],
      hayMas: false,
    });

    const { domicilios } = await buscadorDeDireccionesPorTerritorio.buscar(
      contexto,
      "Calle 20",
      15,
    );

    expect(domicilios[0]?.etiqueta).toBe("Calle 20 sin número, Colonia Centro");
    expect(domicilios[0]?.raiz).toBe("Colonia Centro");
  });
});
