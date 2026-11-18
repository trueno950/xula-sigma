import { describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import type {
  CatalogoDeNombres,
  IdsDeUbicacion,
  LecturaDeNombresDeTerritorio,
} from "./puertosDeUbicacionesDeReporte";
import {
  conUbicaciones,
  idsDeUbicacion,
  ubicacionDeReporte,
} from "./ubicacionesDeReportes";

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "CONSULTA" },
  origen: "web",
};

const catalogo = (): CatalogoDeNombres => ({
  lugares: new Map([
    ["lugar-1", { nombre: "Colonia Centro", raizId: "raiz-1" }],
  ]),
  calles: new Map([["calle-1", "Calle 20"]]),
  domicilios: new Map([["domicilio-1", "Calle 20 #42-B, Colonia Centro"]]),
});

const lectorDePrueba = () => {
  const leer = vi.fn<LecturaDeNombresDeTerritorio["leer"]>();
  leer.mockResolvedValue(catalogo());

  return { crearLectura: () => ({ leer }), leer };
};

describe("ubicacionDeReporte", () => {
  it("nombra el lugar y la calle cuando el reporte se registro por «Lugar y calle»", () => {
    const ubicacion = ubicacionDeReporte(
      { lugarId: "lugar-1", calleId: "calle-1", domicilioId: null },
      catalogo(),
    );

    expect(ubicacion).toEqual({
      modo: "CALLE",
      lugar: "Colonia Centro",
      calleId: "calle-1",
      calle: "Calle 20",
      domicilio: null,
      raizId: "raiz-1",
    });
  });

  it("usa la etiqueta del domicilio cuando el reporte se registro por «Domicilio registrado»", () => {
    // `registrarReporte` guarda tambien la calle del domicilio: sirve para el
    // enlace al historial y no cambia el modo capturado.
    const ubicacion = ubicacionDeReporte(
      { lugarId: "lugar-1", calleId: "calle-1", domicilioId: "domicilio-1" },
      catalogo(),
    );

    expect(ubicacion).toMatchObject({
      modo: "DOMICILIO",
      domicilio: "Calle 20 #42-B, Colonia Centro",
      calle: "Calle 20",
      calleId: "calle-1",
      raizId: "raiz-1",
    });
  });

  it("no inventa calle ni domicilio cuando el reporte solo tiene lugar", () => {
    expect(
      ubicacionDeReporte(
        { lugarId: "lugar-1", calleId: null, domicilioId: null },
        catalogo(),
      ),
    ).toMatchObject({ modo: "CALLE", calle: null, calleId: null });
  });

  it("no inventa nombres ni raiz para un lugar que ya no esta en el catalogo", () => {
    expect(
      ubicacionDeReporte(
        { lugarId: "lugar-ausente", calleId: "calle-1", domicilioId: null },
        catalogo(),
      ),
    ).toEqual({
      modo: "CALLE",
      lugar: null,
      calleId: "calle-1",
      calle: "Calle 20",
      domicilio: null,
      raizId: null,
    });
  });
});

describe("idsDeUbicacion", () => {
  it("junta los ids de la pagina sin repetirlos, uno por catalogo", () => {
    expect(
      idsDeUbicacion([
        { lugarId: "lugar-1", calleId: "calle-1", domicilioId: null },
        { lugarId: "lugar-1", calleId: null, domicilioId: "domicilio-1" },
        { lugarId: "lugar-2", calleId: "calle-1", domicilioId: null },
      ]),
    ).toEqual({
      lugares: ["lugar-1", "lugar-2"],
      calles: ["calle-1"],
      domicilios: ["domicilio-1"],
    });
  });
});

describe("conUbicaciones", () => {
  it("lee el territorio una sola vez para toda la pagina, nunca una por fila", async () => {
    const { crearLectura, leer } = lectorDePrueba();

    const filas = await conUbicaciones(
      [
        { folio: "REP-2026-000001", lugarId: "lugar-1", calleId: "calle-1" },
        { folio: "REP-2026-000002", lugarId: "lugar-1", calleId: null },
        {
          folio: "REP-2026-000003",
          lugarId: "lugar-1",
          calleId: null,
          domicilioId: "domicilio-1",
        },
      ],
      crearLectura,
      contexto,
    );

    const pedidos: IdsDeUbicacion | undefined = leer.mock.calls[0]?.[0];
    expect(leer).toHaveBeenCalledTimes(1);
    expect(pedidos).toEqual({
      lugares: ["lugar-1"],
      calles: ["calle-1"],
      domicilios: ["domicilio-1"],
    });
    expect(filas.map((fila) => fila.ubicacion.domicilio)).toEqual([
      null,
      null,
      "Calle 20 #42-B, Colonia Centro",
    ]);
    expect(filas.every((fila) => fila.ubicacion.raizId === "raiz-1")).toBe(
      true,
    );
  });

  it("una pagina vacia no consulta el territorio", async () => {
    const { crearLectura, leer } = lectorDePrueba();

    await expect(conUbicaciones([], crearLectura, contexto)).resolves.toEqual(
      [],
    );
    expect(leer).not.toHaveBeenCalled();
  });
});
