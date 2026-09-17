import { beforeEach, describe, expect, it, vi } from "vitest";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { TransversalRepetidaError, ZonaIncoherenteError } from "../domain";
import {
  ajenoId,
  asentamientoGuardado,
  calleGuardada,
  calleId,
  contextoCon,
  datosValidos,
  domicilioGuardado,
  domicilioId,
  entreCalleAId,
  lugarGuardado,
  lugarId,
  repositoriosFalsos,
} from "./corregirDomicilioDePrueba";

const withTenantMock = vi.hoisted(() => vi.fn());
const registrarMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

vi.mock("@/shared/tenancy/bitacora", () => ({
  registrar: registrarMock,
}));

const { crearCorregirDomicilio } = await import("./corregirDomicilio");

describe("corregirDomicilio", () => {
  const { repositorio, repositorioDeLugares, repositorioDeCalles } =
    repositoriosFalsos();

  beforeEach(() => {
    vi.resetAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
    vi.mocked(repositorio.bloquearPorId).mockResolvedValue(domicilioGuardado);
    vi.mocked(repositorio.actualizar).mockResolvedValue({
      ...domicilioGuardado,
      numero: "21",
    });
    vi.mocked(repositorioDeLugares.buscarPorId).mockImplementation(
      async (_tx, id) =>
        id === lugarId ? lugarGuardado : asentamientoGuardado,
    );
    vi.mocked(repositorioDeCalles.bloquearPorId).mockResolvedValue(
      calleGuardada,
    );
  });

  const corregir = () =>
    crearCorregirDomicilio(
      repositorio,
      repositorioDeLugares,
      repositorioDeCalles,
    );

  it("rechaza sin puedeEscribir y no abre transaccion", async () => {
    await expect(
      corregir()(datosValidos, contextoCon("CONSULTA")),
    ).rejects.toBeInstanceOf(NoAutorizadoError);

    expect(withTenantMock).not.toHaveBeenCalled();
    expect(repositorio.actualizar).not.toHaveBeenCalled();
  });

  it("rechaza una transversal repetida antes de escribir", async () => {
    await expect(
      corregir()(
        { ...datosValidos, entreCalleAId: calleId },
        contextoCon("OPERADOR"),
      ),
    ).rejects.toBeInstanceOf(TransversalRepetidaError);

    expect(withTenantMock).not.toHaveBeenCalled();
    expect(repositorio.actualizar).not.toHaveBeenCalled();
  });

  it("rechaza un domicilio ajeno o inexistente como si no existiera", async () => {
    vi.mocked(repositorio.bloquearPorId).mockResolvedValue(null);

    await expect(
      corregir()(datosValidos, contextoCon("OPERADOR")),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    expect(repositorio.actualizar).not.toHaveBeenCalled();
  });

  it("rechaza un domicilio dado de baja como si no existiera", async () => {
    vi.mocked(repositorio.bloquearPorId).mockResolvedValue({
      ...domicilioGuardado,
      bajaEn: new Date("2026-01-01T00:00:00.000Z"),
    });

    await expect(
      corregir()(datosValidos, contextoCon("OPERADOR")),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    expect(repositorio.actualizar).not.toHaveBeenCalled();
  });

  it("rechaza una zona que no pertenece a la cadena del lugar", async () => {
    await expect(
      corregir()(
        { ...datosValidos, nivelesDeclarados: [ajenoId] },
        contextoCon("OPERADOR"),
      ),
    ).rejects.toBeInstanceOf(ZonaIncoherenteError);

    expect(repositorio.actualizar).not.toHaveBeenCalled();
  });

  it("rechaza una calle de otro asentamiento del mismo tenant", async () => {
    vi.mocked(repositorioDeCalles.bloquearPorId).mockResolvedValue({
      ...calleGuardada,
      id: entreCalleAId,
      lugarId: ajenoId,
    });

    await expect(
      corregir()({ ...datosValidos, entreCalleAId }, contextoCon("OPERADOR")),
    ).rejects.toBeInstanceOf(ZonaIncoherenteError);

    expect(repositorio.actualizar).not.toHaveBeenCalled();
  });

  it("corrige los cinco campos y registra la bitacora", async () => {
    await corregir()(
      {
        ...datosValidos,
        nivelesDeclarados: [lugarId],
        referencia: "Porton azul",
      },
      contextoCon("OPERADOR"),
    );

    expect(repositorio.actualizar).toHaveBeenCalledWith(expect.anything(), {
      id: domicilioId,
      lugarId,
      calleId,
      numero: "21",
      entreCalleAId: null,
      entreCalleBId: null,
      referencia: "Porton azul",
      bajaEn: null,
    });
    expect(registrarMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        accion: "CORREGIR_DOMICILIO",
        entidad: "domicilios",
        entidadId: domicilioId,
      }),
    );
  });
});
