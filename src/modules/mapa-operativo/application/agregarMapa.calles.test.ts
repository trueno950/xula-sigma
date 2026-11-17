import { beforeEach, describe, expect, it, vi } from "vitest";
import { comoReporteId } from "@/modules/reportes";
import { comoCalleId } from "@/modules/territorio";
import {
  calleConPunto,
  contexto,
  crearFuentesDeMapa,
  sembrarHechos,
} from "./agregarMapaDePrueba";

const RAIZ = {
  id: "99999999-9999-4999-8999-999999999999",
  nombre: "Motul",
};

const OTRA_CALLE = {
  ...calleConPunto,
  id: comoCalleId("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
  nombre: "Calle 21",
};

const reporteEn = (calleId: string, folio: string, id: string) => ({
  id: comoReporteId(id),
  folio,
  tipo: "BASURA",
  estado: "RECIBIDO",
  areaResponsable: null,
  calleId,
  lugarId: calleConPunto.lugarId,
  fechaDeRegistro: "2026-11-16",
});

/**
 * S4 y S5: cada pin es una calle con nombre y territorio, y su insignia lleva
 * el numero de orden de su fila en el panel (L3). El numero se asigna aca y
 * no en la UI: es el mismo valor para el pin y para la fila, y dos cuentas
 * distintas se desincronizan sin que nada falle.
 */
describe("agregarMapa: la calle de cada pin", () => {
  const fuentes = crearFuentesDeMapa();

  beforeEach(() => sembrarHechos(fuentes));

  it("nombra la calle y su territorio, resolviendo el lugar contra las raices", async () => {
    vi.mocked(fuentes.territoriosParaMapa).mockResolvedValue([RAIZ]);
    vi.mocked(fuentes.lugaresDelSubarbol).mockResolvedValue([
      calleConPunto.lugarId,
    ]);
    const { crearAgregarMapa } = await import("./agregarMapa");

    const mapa = await crearAgregarMapa(fuentes)(contexto, {});

    expect(mapa.marcadores).toHaveLength(1);
    expect(mapa.marcadores[0]).toEqual(
      expect.objectContaining({
        calleNombre: calleConPunto.nombre,
        territorioNombre: RAIZ.nombre,
      }),
    );
  });

  it("sin territorio reconocido no inventa uno: la fila omite el territorio", async () => {
    const { crearAgregarMapa } = await import("./agregarMapa");

    const mapa = await crearAgregarMapa(fuentes)(contexto, {});

    expect(mapa.marcadores[0]?.territorioNombre).toBeNull();
  });

  it("numera los pines en el orden de las filas del panel, desde uno", async () => {
    vi.mocked(fuentes.callesParaMapa).mockResolvedValue([
      calleConPunto,
      OTRA_CALLE,
    ]);
    vi.mocked(fuentes.reportesParaMapa).mockResolvedValue([
      reporteEn(
        calleConPunto.id,
        "REP-1",
        "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      ),
      reporteEn(OTRA_CALLE.id, "REP-2", "cccccccc-cccc-4ccc-8ccc-cccccccccccc"),
    ]);
    const { crearAgregarMapa } = await import("./agregarMapa");

    const mapa = await crearAgregarMapa(fuentes)(contexto, {});

    expect(
      mapa.marcadores.map(({ orden, calleNombre }) => [orden, calleNombre]),
    ).toEqual([
      [1, calleConPunto.nombre],
      [2, OTRA_CALLE.nombre],
    ]);
  });
});
