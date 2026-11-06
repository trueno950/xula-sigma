import { describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import {
  crearBuscarDireccionesParaReporte,
  LIMITE_DE_BUSQUEDA_DE_DIRECCIONES,
} from "./buscarDireccionesParaReporte";
import type { BuscadorDeDirecciones } from "./puertosDeDirecciones";

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "OPERADOR" },
  origen: "web",
};

const domicilio = {
  id: "11111111-1111-4111-8111-111111111111",
  calle: "Calle 20",
  numero: "42-B",
  lugar: "Colonia Centro",
  raiz: "Buenavista",
  lugarId: "22222222-2222-4222-8222-222222222222",
};

describe("buscarDireccionesParaReporte", () => {
  it("normaliza la consulta, limita resultados y compone una etiqueta con numero y jerarquia", async () => {
    const buscador: BuscadorDeDirecciones = {
      buscar: vi
        .fn()
        .mockResolvedValue({ domicilios: [domicilio], hayMas: true }),
    };

    const resultado = await crearBuscarDireccionesParaReporte(buscador)(
      "  Calle 20  ",
      contexto,
    );

    expect(buscador.buscar).toHaveBeenCalledWith(
      contexto,
      "Calle 20",
      LIMITE_DE_BUSQUEDA_DE_DIRECCIONES,
    );
    expect(resultado).toEqual({
      opciones: [
        {
          id: domicilio.id,
          etiqueta: "Calle 20 #42-B, Colonia Centro, Buenavista",
          lugarId: domicilio.lugarId,
        },
      ],
      hayMas: true,
    });
  });

  it("no consulta el catalogo si la busqueda no alcanza la longitud minima", async () => {
    const buscador: BuscadorDeDirecciones = { buscar: vi.fn() };

    await expect(
      crearBuscarDireccionesParaReporte(buscador)("  ", contexto),
    ).resolves.toEqual({ opciones: [], hayMas: false });

    expect(buscador.buscar).not.toHaveBeenCalled();
  });
});
