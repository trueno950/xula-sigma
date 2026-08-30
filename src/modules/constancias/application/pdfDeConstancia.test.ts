import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoEncontradoError } from "@/shared/lib/errores";
import { comoConstanciaId, comoReimpresionId } from "../domain";
import type { ConstanciaGuardada, RepositorioDeConstancias } from "./puertos";
import type {
  AyuntamientoLeido,
  LecturaDeAyuntamiento,
} from "./puertosDeLectura";
import type { RenderizadorDeConstancias } from "./puertosDeRender";

/**
 * Puertos mockeados y renderizador falso, mismo patron que
 * `emitirConstancia.test.ts`: la nunca-renderiza-sin-acreditar es lo que
 * este archivo prueba, no si `@react-pdf/renderer` produce bytes validos
 * -eso lo cubre `renderizadorReactPdf.test.ts`.
 */
const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearPdfDeConstancia } = await import("./pdfDeConstancia");

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "OPERADOR" },
  origen: "web",
};

const constanciaId = comoConstanciaId("11111111-1111-4111-8111-111111111111");
const reimpresionId = comoReimpresionId("22222222-2222-4222-8222-222222222222");

const constanciaGuardada: ConstanciaGuardada = {
  id: constanciaId,
  ayuntamientoId: contexto.ayuntamientoId,
  tipo: "VECINDAD",
  folio: "VEC-2026-000001",
  anio: 2026,
  consecutivo: 1,
  codigoVerificacion: "abc123",
  personaId: "44444444-4444-4444-8444-444444444444",
  datos: {
    titular: { nombreCompleto: "Juan Poot" },
    direccion: {
      texto: "Calle 20 #10",
      residenciaId: "residencia-1",
      desdeEn: "2024-01-01",
    },
    firmante: { nombre: "Maria Poot", cargo: "Secretaria Municipal" },
  },
  plantillaVersion: "vecindad-v1",
  emitidaPorUsuarioId: "usuario-1",
  emitidaEn: new Date("2026-01-01T00:00:00Z"),
  canceladaEn: null,
  canceladaPorUsuarioId: null,
  motivoCancelacion: null,
};

const ayuntamientoLeido: AyuntamientoLeido = {
  nombre: "Motul",
  subdominio: "motul",
  escudo: "https://assets.example.com/motul/escudo.png",
};

describe("pdfDeConstancia", () => {
  const repositorio: RepositorioDeConstancias = {
    guardar: vi.fn(),
    buscarPorId: vi.fn(),
    listar: vi.fn(),
    paraValidar: vi.fn(),
    registrarReimpresion: vi.fn(),
    existeReimpresion: vi.fn(),
    cancelar: vi.fn(),
  };
  const lecturaDeAyuntamiento: LecturaDeAyuntamiento = { porId: vi.fn() };
  const renderizador: RenderizadorDeConstancias = { aPdf: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
    vi.mocked(lecturaDeAyuntamiento.porId).mockResolvedValue(ayuntamientoLeido);
    vi.mocked(renderizador.aPdf).mockResolvedValue(new Uint8Array([1, 2, 3]));
  });

  const pdfDeConstancia = () =>
    crearPdfDeConstancia(repositorio, lecturaDeAyuntamiento, renderizador);

  it("id inexistente o de otro tenant -> NoEncontradoError, nunca llama al renderizador", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(null);

    await expect(
      pdfDeConstancia()({ id: constanciaId }, contexto),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    expect(renderizador.aPdf).not.toHaveBeenCalled();
  });

  it("reimpresion inexistente, o de otra constancia -> NoEncontradoError, nunca llama al renderizador", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(constanciaGuardada);
    // `existeReimpresion(tx, id, constanciaId)` es quien encierra el FK
    // compuesto: `false` cubre por igual "el id no existe" y "el id existe
    // pero es de otra constancia" -las dos ramas de design.md seccion 11-,
    // porque la unica evidencia que este caso de uso puede leer es la
    // respuesta booleana del puerto, no la fila cruda.
    vi.mocked(repositorio.existeReimpresion).mockResolvedValue(false);

    await expect(
      pdfDeConstancia()({ id: constanciaId, reimpresionId }, contexto),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    expect(repositorio.existeReimpresion).toHaveBeenCalledWith(
      expect.anything(),
      reimpresionId,
      constanciaId,
    );
    expect(renderizador.aPdf).not.toHaveBeenCalled();
  });

  it("camino feliz sin reimpresion: el renderizador recibe reimpresion: false", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(constanciaGuardada);

    const salida = await pdfDeConstancia()({ id: constanciaId }, contexto);

    expect(repositorio.existeReimpresion).not.toHaveBeenCalled();
    expect(renderizador.aPdf).toHaveBeenCalledTimes(1);
    expect(renderizador.aPdf).toHaveBeenCalledWith(
      expect.objectContaining({ reimpresion: false, folio: "VEC-2026-000001" }),
    );
    expect(salida).toEqual({
      bytes: new Uint8Array([1, 2, 3]),
      folio: "VEC-2026-000001",
    });
  });

  it("camino feliz con reimpresion valida: el renderizador recibe reimpresion: true", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(constanciaGuardada);
    vi.mocked(repositorio.existeReimpresion).mockResolvedValue(true);

    await pdfDeConstancia()({ id: constanciaId, reimpresionId }, contexto);

    expect(renderizador.aPdf).toHaveBeenCalledWith(
      expect.objectContaining({ reimpresion: true }),
    );
  });

  it("compone la entrada del renderizador con el snapshot, el municipio y la URL de validacion", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(constanciaGuardada);

    await pdfDeConstancia()({ id: constanciaId }, contexto);

    expect(renderizador.aPdf).toHaveBeenCalledWith({
      folio: "VEC-2026-000001",
      tipo: "VECINDAD",
      plantillaVersion: "vecindad-v1",
      datos: constanciaGuardada.datos,
      municipio: { nombre: "Motul", escudo: ayuntamientoLeido.escudo },
      urlDeValidacion:
        "https://motul.localhost/validar/VEC-2026-000001?c=abc123",
      reimpresion: false,
    });
  });
});
