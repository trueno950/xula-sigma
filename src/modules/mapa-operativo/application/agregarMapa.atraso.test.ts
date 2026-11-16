import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  calleConPunto,
  contexto,
  crearFuentesDeMapa,
  REPORTE_EN_CALLE,
  REPORTE_SIN_CALLE,
  sembrarHechos,
} from "./agregarMapaDePrueba";

/**
 * S1 de `gestion-municipal` en el mapa: el mapa marca los reportes que
 * pasaron el umbral del municipio y publica el conteo en la leyenda. El
 * umbral llega por el puerto -`reportes` es su dueno- y la fecha de registro
 * ya viene como fecha civil; el dia de hoy se fija con `hoyEnMerida` para no
 * depender del reloj de la corrida.
 */

const hoyEnMeridaMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/lib/fecha", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/lib/fecha")>()),
  hoyEnMerida: hoyEnMeridaMock,
}));

const { crearAgregarMapa } = await import("./agregarMapa");

const HOY = "2026-11-16";
const HACE_DIEZ_DIAS = "2026-11-06";

const fuentes = crearFuentesDeMapa();

const reporteDe = (parcial: {
  id: typeof REPORTE_EN_CALLE | typeof REPORTE_SIN_CALLE;
  folio: string;
  calleId: string | null;
  fechaDeRegistro: string;
  estado?: "RECIBIDO" | "EN_ATENCION";
}) => ({
  ...parcial,
  tipo: "BACHE" as const,
  estado: parcial.estado ?? ("RECIBIDO" as const),
  areaResponsable: null,
  lugarId: calleConPunto.lugarId,
});

const mapaConFechas = (
  fechas: { enCalle: string; sinCalle: string },
  umbral = 7,
) => {
  sembrarHechos(fuentes);
  vi.mocked(fuentes.umbralDeAtraso).mockResolvedValue(umbral);
  vi.mocked(fuentes.reportesParaMapa).mockResolvedValue([
    reporteDe({
      id: REPORTE_EN_CALLE,
      folio: "REP-1",
      calleId: calleConPunto.id,
      fechaDeRegistro: fechas.enCalle,
    }),
    reporteDe({
      id: REPORTE_SIN_CALLE,
      folio: "REP-2",
      calleId: null,
      fechaDeRegistro: fechas.sinCalle,
    }),
  ]);

  return crearAgregarMapa(fuentes)(contexto, {});
};

describe("agregarMapa: la senal de atraso de S1", () => {
  beforeEach(() => {
    hoyEnMeridaMock.mockReturnValue(HOY);
  });

  it("cuenta solo los reportes que pasaron el umbral del municipio", async () => {
    const mapa = await mapaConFechas({
      enCalle: HACE_DIEZ_DIAS,
      sinCalle: "2026-11-15",
    });

    expect(fuentes.umbralDeAtraso).toHaveBeenCalledWith(contexto);
    expect(mapa.leyenda.atrasados).toBe(1);
    expect(mapa.marcadores[0]?.hechos[0]?.diasDeAtraso).toBe(10);
  });

  it("con un umbral mas alto que los dias transcurridos no hay atrasados", async () => {
    const mapa = await mapaConFechas(
      { enCalle: HACE_DIEZ_DIAS, sinCalle: "2026-11-15" },
      11,
    );

    expect(mapa.leyenda.atrasados).toBe(0);
  });

  it("un reporte ya atendido no se marca aunque tenga meses", async () => {
    sembrarHechos(fuentes);
    vi.mocked(fuentes.reportesParaMapa).mockResolvedValue([
      reporteDe({
        id: REPORTE_EN_CALLE,
        folio: "REP-1",
        calleId: calleConPunto.id,
        fechaDeRegistro: "2026-01-01",
        estado: "EN_ATENCION",
      }),
    ]);

    const mapa = await crearAgregarMapa(fuentes)(contexto, {});

    expect(mapa.leyenda.atrasados).toBe(0);
    expect(mapa.marcadores[0]?.hechos[0]?.diasDeAtraso).toBeNull();
  });
});
