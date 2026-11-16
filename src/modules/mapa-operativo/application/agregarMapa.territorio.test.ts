import { beforeEach, describe, expect, it, vi } from "vitest";
import { comoIntervencionId } from "@/modules/intervenciones";
import { comoReporteId } from "@/modules/reportes";
import type { ContextoActual } from "@/shared/auth/contexto";
import { cajaDePuntos } from "../domain";
import { crearAgregarMapa } from "./agregarMapa";
import type { CalleParaMapaOperativo, FuentesDeMapa } from "./puertos";

const contexto: ContextoActual = {
  ayuntamientoId:
    "11111111-1111-4111-8111-111111111111" as ContextoActual["ayuntamientoId"],
  usuario: { id: "operador-1", rol: "OPERADOR" },
  origen: "web",
};

const CABECERA = "cabecera-1";
const COMISARIA = "comisaria-1";
const ARISTA = "asistencia-1";
const SIN_CALLES = "comisaria-sin-calles";
const AJENO = "lugar-de-otro-municipio";

const calleDe = (
  id: string,
  lugarId: string,
  punto: { latitud: number; longitud: number } | null,
): CalleParaMapaOperativo => ({ id, nombre: `Calle ${id}`, lugarId, punto });

const CALLE_DE_LA_COMISARIA = calleDe("calle-comisaria", COMISARIA, {
  latitud: 21.02,
  longitud: -89.6,
});
const CALLE_DE_LA_CABECERA = calleDe("calle-cabecera", CABECERA, {
  latitud: 20.9674,
  longitud: -89.5926,
});
// Colgada de la comisaria por la arista: el subarbol la trae, la raiz no.
const CALLE_DE_LA_ARISTA = calleDe("calle-arista", ARISTA, {
  latitud: 21.04,
  longitud: -89.62,
});

const fuentes: FuentesDeMapa = {
  callesParaMapa: vi.fn(),
  reportesParaMapa: vi.fn(),
  callesSinUbicar: vi.fn().mockResolvedValue([]),
  intervencionesParaMapa: vi.fn(),
  territoriosParaMapa: vi.fn(),
  umbralDeAtraso: vi.fn(),
  lugaresDelSubarbol: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fuentes.callesParaMapa).mockResolvedValue([
    CALLE_DE_LA_COMISARIA,
    CALLE_DE_LA_CABECERA,
    CALLE_DE_LA_ARISTA,
  ]);
  vi.mocked(fuentes.reportesParaMapa).mockResolvedValue([
    // El lugar propio dice cabecera y la calle dice comisaria: manda la calle.
    {
      id: comoReporteId("55555555-5555-4555-8555-555555555555"),
      folio: "REP-COMISARIA",
      tipo: "BACHE",
      estado: "RECIBIDO",
      areaResponsable: null,
      calleId: CALLE_DE_LA_COMISARIA.id,
      lugarId: CABECERA,
      fechaDeRegistro: "2026-11-16",
    },
    {
      id: comoReporteId("66666666-6666-4666-8666-666666666666"),
      folio: "REP-SIN-CALLE",
      tipo: "FUGA",
      estado: "RECIBIDO",
      areaResponsable: null,
      calleId: null,
      lugarId: CABECERA,
      fechaDeRegistro: "2026-11-16",
    },
  ]);
  vi.mocked(fuentes.intervencionesParaMapa).mockResolvedValue([
    {
      id: comoIntervencionId("77777777-7777-4777-8777-777777777777"),
      tipo: "OBRA",
      estado: "PLANIFICADA",
      calleId: CALLE_DE_LA_CABECERA.id,
      lugarId: CABECERA,
      fechaDeOcurrencia: "2026-01-15",
    },
  ]);
  vi.mocked(fuentes.territoriosParaMapa).mockResolvedValue([
    { id: CABECERA, nombre: "Motul" },
    { id: COMISARIA, nombre: "Comisaría de Kinchil" },
    { id: SIN_CALLES, nombre: "Comisaría sin calles" },
  ]);
  vi.mocked(fuentes.lugaresDelSubarbol).mockResolvedValue([ARISTA]);
});

const foliosDe = (
  mapa: Awaited<ReturnType<ReturnType<typeof crearAgregarMapa>>>,
) =>
  [...mapa.marcadores.flatMap((marcador) => marcador.hechos), ...mapa.cobertura]
    .map((hecho) => hecho.etiqueta)
    .sort();

describe("agregarMapa: territorio elegido", () => {
  it("sin lugar en la URL ofrece todas las raices y no acota nada", async () => {
    const mapa = await crearAgregarMapa(fuentes)(contexto, {});

    expect(mapa.territorios).toEqual([
      { id: CABECERA, nombre: "Motul" },
      { id: COMISARIA, nombre: "Comisaría de Kinchil" },
      { id: SIN_CALLES, nombre: "Comisaría sin calles" },
    ]);
    expect(mapa.territorioElegido).toBeNull();
    expect(foliosDe(mapa)).toEqual(["Obra", "REP-COMISARIA", "REP-SIN-CALLE"]);
    expect(fuentes.lugaresDelSubarbol).not.toHaveBeenCalled();
  });

  it("la caja es la de todas las calles ubicadas del municipio", async () => {
    const mapa = await crearAgregarMapa(fuentes)(contexto, {});

    expect(mapa.caja).toEqual(
      cajaDePuntos([
        { latitud: 21.02, longitud: -89.6 },
        { latitud: 20.9674, longitud: -89.5926 },
        { latitud: 21.04, longitud: -89.62 },
      ]),
    );
  });

  it("acota hechos y caja al subarbol del lugar elegido", async () => {
    const mapa = await crearAgregarMapa(fuentes)(contexto, {
      lugar: COMISARIA,
    });

    expect(fuentes.lugaresDelSubarbol).toHaveBeenCalledWith(
      contexto,
      COMISARIA,
    );
    expect(mapa.territorioElegido).toEqual({
      id: COMISARIA,
      nombre: "Comisaría de Kinchil",
    });
    expect(foliosDe(mapa)).toEqual(["REP-COMISARIA"]);
    expect(mapa.caja).toEqual(
      cajaDePuntos([
        { latitud: 21.02, longitud: -89.6 },
        { latitud: 21.04, longitud: -89.62 },
      ]),
    );
    expect(mapa.conteos).toEqual({ reportes: 1, intervenciones: 0, total: 1 });
  });

  /**
   * Solo una raiz es un territorio elegible. Con un `?lugar=` que no lo sea
   * -una colonia, un id de otro municipio, uno borrado- la pantalla no puede
   * mostrar el selector en una opcion y los hechos de otra, asi que vale
   * «todo el municipio»: no se filtra y el selector queda en su marcador.
   */
  it.each([
    ["una colonia del propio municipio", ARISTA],
    ["un lugar de otro municipio", AJENO],
    ["un id que ya no existe", "99999999-9999-4999-8999-999999999999"],
  ])("un lugar que no es una raiz (%s) no acota nada", async (_caso, lugar) => {
    const mapa = await crearAgregarMapa(fuentes)(contexto, { lugar });

    expect(mapa.territorioElegido).toBeNull();
    expect(foliosDe(mapa)).toEqual(["Obra", "REP-COMISARIA", "REP-SIN-CALLE"]);
    expect(fuentes.lugaresDelSubarbol).not.toHaveBeenCalled();
    expect(mapa.caja).toEqual(
      cajaDePuntos([
        { latitud: 21.02, longitud: -89.6 },
        { latitud: 20.9674, longitud: -89.5926 },
        { latitud: 21.04, longitud: -89.62 },
      ]),
    );
  });

  it("sin calles ubicadas en el territorio no hay caja que bloquear", async () => {
    vi.mocked(fuentes.lugaresDelSubarbol).mockResolvedValueOnce([]);

    const mapa = await crearAgregarMapa(fuentes)(contexto, {
      lugar: SIN_CALLES,
    });

    expect(fuentes.lugaresDelSubarbol).toHaveBeenCalledWith(
      contexto,
      SIN_CALLES,
    );
    expect(mapa.caja).toBeNull();
  });
});
