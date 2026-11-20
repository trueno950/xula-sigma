import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { ValidacionError } from "@/shared/lib/errores";
import { comoIntervencionId } from "../domain";
import type { ObraDeReporte } from "./obrasDeReporte";

const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({ withTenant: withTenantMock }));

const { crearObrasDeReporte } = await import("./obrasDeReporte");
const { obraConfirmada } = await import("./obrasDeReporte");

const tx = { marca: "tx-de-obras-del-reporte" };
const REPORTE = "55555555-5555-4555-8555-555555555555";

const contexto = (
  rol: ContextoActual["usuario"]["rol"] = "CONSULTA",
): ContextoActual => ({
  ayuntamientoId:
    "11111111-1111-4111-8111-111111111111" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const obra: ObraDeReporte = {
  id: comoIntervencionId("33333333-3333-4333-8333-333333333333"),
  tipo: "BACHE" as const,
  estado: "PLANIFICADA" as const,
  fechaDeOcurrencia: "2026-11-20",
};

beforeEach(() => {
  vi.clearAllMocks();
  withTenantMock.mockImplementation(
    (_id: unknown, trabajo: (actual: unknown) => unknown) => trabajo(tx),
  );
});

describe("obrasDeReporte", () => {
  it("lee las obras del reporte bajo el tenant del contexto", async () => {
    const listar = vi.fn().mockResolvedValue([]);
    const leer = crearObrasDeReporte({ listar });

    await leer(REPORTE, contexto());

    expect(withTenantMock).toHaveBeenCalledWith(
      contexto().ayuntamientoId,
      expect.any(Function),
    );
    expect(listar).toHaveBeenCalledWith(tx, REPORTE);
  });

  it("devuelve lo que el lector trajo, sin filtrar ni reordenar", async () => {
    const filas = [
      obra,
      { ...obra, id: "44444444-4444-4444-8444-444444444444" },
    ];
    const leer = crearObrasDeReporte({
      listar: vi.fn().mockResolvedValue(filas),
    });

    await expect(leer(REPORTE, contexto())).resolves.toBe(filas);
  });

  /**
   * Leer no es escribir: el aviso y el enlace de S16 no dependen de quien
   * administra reportes, solo de que la obra exista bajo el tenant.
   */
  it("sin guarda de rol, tambien para consulta", async () => {
    const listar = vi.fn().mockResolvedValue([obra]);
    const leer = crearObrasDeReporte({ listar });

    await expect(leer(REPORTE, contexto("CONSULTA"))).resolves.toEqual([obra]);
    expect(listar).toHaveBeenCalledTimes(1);
  });

  it("un reporte que no es uuid no llega a la base", async () => {
    const listar = vi.fn();

    await expect(
      crearObrasDeReporte({ listar })("reporte-1", contexto()),
    ).rejects.toThrow(ValidacionError);

    expect(withTenantMock).not.toHaveBeenCalled();
    expect(listar).not.toHaveBeenCalled();
  });
});

/**
 * S16 (P1): el `?obra=` de la URL no se pinta sin comprobarlo. La decision
 * vive aca, no en la pantalla, para poder probarla sin renderizar la ficha:
 * la confirmacion solo aparece para una obra de este reporte, leida bajo RLS.
 */
describe("obraConfirmada", () => {
  it("devuelve la obra cuando el id pedido esta entre las del reporte", () => {
    expect(obraConfirmada(obra.id, [obra])).toBe(obra);
  });

  it.each([
    ["otra obra del municipio", "44444444-4444-4444-8444-444444444444"],
    ["un id inventado", "99999999-9999-4999-8999-999999999999"],
  ])("no confirma %s", (_caso, pedida) => {
    expect(obraConfirmada(pedida, [obra])).toBeUndefined();
  });

  it("sin ?obra= no hay nada que confirmar", () => {
    expect(obraConfirmada(undefined, [obra])).toBeUndefined();
  });

  it("sin obras en el reporte tampoco", () => {
    expect(obraConfirmada(obra.id, [])).toBeUndefined();
  });
});
