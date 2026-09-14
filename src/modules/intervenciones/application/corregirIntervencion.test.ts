import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import {
  NoAutorizadoError,
  NoEncontradoError,
  ValidacionError,
} from "@/shared/lib/errores";
import type { RepositorioDeIntervenciones } from "./puertos";

const tx = {};
const withTenantMock = vi.hoisted(() => vi.fn());
const registrarMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({ withTenant: withTenantMock }));
vi.mock("@/shared/tenancy/bitacora", () => ({ registrar: registrarMock }));

const { crearCorregirIntervencion } = await import("./corregirIntervencion");

const contexto = (rol: ContextoActual["usuario"]["rol"]): ContextoActual => ({
  ayuntamientoId:
    "11111111-1111-4111-8111-111111111111" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const entrada = {
  id: "33333333-3333-4333-8333-333333333333",
  tipo: "MEJORA" as const,
  fechaDeOcurrencia: "2026-02-20",
  lugarId: "22222222-2222-4222-8222-222222222222",
  calleId: null,
  reporteId: null,
  descripcion: "Rehabilitacion del parque municipal",
};

describe("corregirIntervencion", () => {
  const repositorio: Pick<RepositorioDeIntervenciones, "corregir"> = {
    corregir: vi.fn().mockResolvedValue(true),
  };
  const lectura = { de: vi.fn().mockResolvedValue({ texto: "Centro" }) };
  const lecturaDeReportes = { porId: vi.fn() };
  const corregir = crearCorregirIntervencion({
    repositorio,
    crearLecturaDeUbicaciones: () => lectura,
    crearLecturaDeReportes: () => lecturaDeReportes,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (actualTx: unknown) => unknown) => trabajo(tx),
    );
    vi.mocked(repositorio.corregir).mockResolvedValue(true);
    vi.mocked(lecturaDeReportes.porId).mockResolvedValue(true);
  });

  it("niega roles que no administran antes de abrir transaccion", async () => {
    for (const rol of ["OPERADOR", "CONSULTA", "SUPER_ADMIN"] as const) {
      await expect(corregir(entrada, contexto(rol))).rejects.toBeInstanceOf(
        NoAutorizadoError,
      );
    }

    expect(withTenantMock).not.toHaveBeenCalled();
  });

  it("valida la entrada y no acepta tenant del cliente", async () => {
    await expect(
      corregir(
        { ...entrada, ayuntamientoId: "99999999-9999-4999-8999-999999999999" },
        contexto("ADMIN_MUNICIPAL"),
      ),
    ).rejects.toBeInstanceOf(ValidacionError);
  });

  it("traduce una fila no visible a NoEncontradoError", async () => {
    vi.mocked(repositorio.corregir).mockResolvedValue(false);

    await expect(
      corregir(entrada, contexto("ADMIN_MUNICIPAL")),
    ).rejects.toBeInstanceOf(NoEncontradoError);
  });

  it.each([
    ["un reporte de otro municipio", "44444444-4444-4444-8444-444444444444"],
    ["un reporte inexistente", "55555555-5555-4555-8555-555555555555"],
  ])(
    "rechaza %s antes de corregir, revisar o auditar",
    async (_caso, reporteId) => {
      vi.mocked(lecturaDeReportes.porId).mockResolvedValue(false);

      await expect(
        corregir({ ...entrada, reporteId }, contexto("ADMIN_MUNICIPAL")),
      ).rejects.toBeInstanceOf(NoEncontradoError);

      expect(lecturaDeReportes.porId).toHaveBeenCalledWith(tx, reporteId);
      expect(repositorio.corregir).not.toHaveBeenCalled();
      expect(registrarMock).not.toHaveBeenCalled();
    },
  );

  it("ADMIN_MUNICIPAL corrige en su tenant y audita solo por ids", async () => {
    await corregir(entrada, contexto("ADMIN_MUNICIPAL"));

    expect(repositorio.corregir).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        ayuntamientoId: "11111111-1111-4111-8111-111111111111",
        usuarioId: "usuario-1",
      }),
    );
    expect(lectura.de).toHaveBeenCalledWith(
      tx,
      entrada.lugarId,
      entrada.calleId,
    );
    expect(registrarMock).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        accion: "CORREGIR_INTERVENCION",
        entidad: "intervenciones",
        entidadId: entrada.id,
        actor: "usuario-1",
      }),
    );
    expect(registrarMock.mock.calls[0]?.[1]).not.toHaveProperty("descripcion");
  });
});
