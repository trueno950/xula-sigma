import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { comoCalleId, comoLugarId } from "../domain";
import type { LectorDeUbicaciones } from "./puertosDeDirecciones";

const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearUbicacionDeLugar } = await import("./ubicacionDeLugar");

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "CONSULTA" },
  origen: "web",
};

const lugarId = comoLugarId("11111111-1111-4111-8111-111111111111");
const calleId = comoCalleId("22222222-2222-4222-8222-222222222222");

describe("ubicacionDeLugar", () => {
  const lector: LectorDeUbicaciones = { partesDe: vi.fn() };

  beforeEach(() => {
    vi.resetAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
  });

  const ubicacionDeLugar = crearUbicacionDeLugar(lector);

  it("partesDe null (lugar inexistente, de baja o de otro tenant) devuelve null sin lanzar", async () => {
    vi.mocked(lector.partesDe).mockResolvedValue(null);

    const resultado = await ubicacionDeLugar(
      { lugarId, calleId: null },
      contexto,
    );

    expect(resultado).toBeNull();
  });

  it("camino feliz devuelve el texto compuesto con componerUbicacion", async () => {
    vi.mocked(lector.partesDe).mockResolvedValue({
      calle: "Calle 20",
      ancestros: ["Colonia Centro", "Motul"],
    });

    const resultado = await ubicacionDeLugar({ lugarId, calleId }, contexto);

    expect(resultado).toEqual({ texto: "Calle 20, Colonia Centro, Motul" });
    expect(lector.partesDe).toHaveBeenCalledWith(
      expect.anything(),
      lugarId,
      calleId,
    );
  });
});
