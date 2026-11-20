import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { comoIntervencionId } from "../domain";
import type { IntervencionGuardada } from "./puertos";
import type { RevisionGuardadaDeIntervencion } from "./puertosDeHistorial";

/**
 * S11 de `intervenciones-ux`: el historial dice que cambio, quien y cuando,
 * y solo afirma «antes → despues» donde `revisiones_de_intervenciones` lo
 * sostiene. El sujeto es el caso de uso; la pantalla solo pinta lo que este
 * devuelve.
 */
const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearHistorialDeIntervencion } = await import(
  "./historialDeIntervencion"
);

const contexto: ContextoActual = {
  ayuntamientoId:
    "11111111-1111-4111-8111-111111111111" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "ADMIN_MUNICIPAL" },
  origen: "web",
};

const intervencion: IntervencionGuardada = {
  id: comoIntervencionId("33333333-3333-4333-8333-333333333333"),
  tipo: "PAVIMENTACION",
  estado: "EN_EJECUCION",
  fechaDeOcurrencia: "2026-11-12",
  lugarId: "22222222-2222-4222-8222-222222222222",
  calleId: "44444444-4444-4444-8444-444444444444",
  reporteId: null,
  descripcion: "Pavimentación con concreto hidráulico de la calle de acceso.",
  registradoPorUsuarioId: "usuario-ana",
  capturadoEn: new Date("2026-11-12T15:20:00Z"),
  actualizadoEn: new Date("2026-11-15T15:40:00Z"),
};

const revision = (
  indice: number,
  valoresAnteriores: RevisionGuardadaDeIntervencion["valoresAnteriores"],
): RevisionGuardadaDeIntervencion => ({
  id: `revision-${indice}`,
  valoresAnteriores,
  ocurridoEn: new Date(`2026-11-1${indice}T16:05:00Z`),
  autor: { nombre: "Ana Canché", rol: "ADMIN_MUNICIPAL" },
});

const leerMock = vi.hoisted(() => vi.fn());

const historialDeIntervencion = crearHistorialDeIntervencion({
  leer: leerMock,
});

const foto = (
  cambios: Partial<RevisionGuardadaDeIntervencion["valoresAnteriores"]>,
): RevisionGuardadaDeIntervencion["valoresAnteriores"] => ({
  tipo: intervencion.tipo,
  estado: intervencion.estado,
  fechaDeOcurrencia: intervencion.fechaDeOcurrencia,
  lugarId: intervencion.lugarId,
  calleId: intervencion.calleId,
  reporteId: intervencion.reporteId,
  descripcion: intervencion.descripcion,
  ...cambios,
});

const conRevisiones = (revisiones: readonly RevisionGuardadaDeIntervencion[]) =>
  leerMock.mockResolvedValue({
    revisiones,
    registradaPor: { nombre: "Ana Canché", rol: "ADMIN_MUNICIPAL" },
  });

beforeEach(() => {
  vi.clearAllMocks();
  withTenantMock.mockImplementation(
    (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
  );
});

describe("historial de una intervencion", () => {
  it("dice que se corrigio, quien lo corrigio y cuando, de lo mas nuevo a lo mas viejo", async () => {
    conRevisiones([
      revision(
        3,
        foto({
          descripcion: "Pavimentación de la calle de acceso.",
          calleId: null,
        }),
      ),
      revision(4, foto({ calleId: null })),
    ]);

    const historial = await historialDeIntervencion(intervencion, contexto);

    expect(historial.revisiones.map((r) => r.titulo)).toEqual([
      "Calle corregida",
      "Descripción corregida",
    ]);
    expect(historial.revisiones[1]?.cambios).toEqual([
      "Antes decía «Pavimentación de la calle de acceso.».",
    ]);
    expect(historial.revisiones[1]?.autor).toEqual({
      nombre: "Ana Canché",
      rol: "ADMIN_MUNICIPAL",
    });
    expect(historial.revisiones[1]?.ocurridoEn).toEqual(
      new Date("2026-11-13T16:05:00Z"),
    );
  });

  it("cita el valor que quedo en la revision siguiente, no uno inventado", async () => {
    conRevisiones([
      revision(
        3,
        foto({
          tipo: "BACHE",
          descripcion: "Pavimentación con concreto.",
        }),
      ),
      revision(4, foto({ descripcion: "Pavimentación con concreto." })),
    ]);

    const historial = await historialDeIntervencion(intervencion, contexto);

    // La primera revision (mas vieja) cambio el tipo y lo dejo en PAVIMENTACION,
    // que es lo que guarda la revision siguiente; la segunda es la descripcion.
    expect(historial.revisiones[1]?.titulo).toBe("Tipo corregido");
    expect(historial.revisiones[1]?.cambios).toEqual(["Antes decía «Bache»."]);
    expect(historial.revisiones[0]?.titulo).toBe("Descripción corregida");
  });

  it("no inventa un cambio de estado: la revision guarda el estado y no cambio", async () => {
    conRevisiones([revision(3, foto({ estado: "PLANIFICADA" }))]);

    const historial = await historialDeIntervencion(intervencion, contexto);

    expect(historial.revisiones[0]?.titulo).toBe("Corrección sin cambios");
    expect(historial.revisiones[0]?.cambios).toEqual([]);
    expect(JSON.stringify(historial)).not.toContain("En ejecución");
  });

  it("nombra cada campo cuando una sola revision cambio varios datos", async () => {
    conRevisiones([revision(3, foto({ tipo: "BACHE", calleId: null }))]);

    const historial = await historialDeIntervencion(intervencion, contexto);

    expect(historial.revisiones[0]?.titulo).toBe("Varios datos corregidos");
    expect(historial.revisiones[0]?.cambios).toEqual([
      "Tipo: antes decía «Bache».",
      "Calle: antes decía «Sin calle».",
    ]);
  });

  it("devuelve quien registro la intervencion para el bloque de sistema", async () => {
    conRevisiones([]);

    const historial = await historialDeIntervencion(intervencion, contexto);

    expect(historial.registradaPor).toEqual({
      nombre: "Ana Canché",
      rol: "ADMIN_MUNICIPAL",
    });
    expect(historial.revisiones).toEqual([]);
    expect(leerMock).toHaveBeenCalledWith(expect.anything(), {
      intervencionId: intervencion.id,
      registradoPorUsuarioId: "usuario-ana",
    });
  });
});
