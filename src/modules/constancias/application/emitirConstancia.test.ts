import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import {
  DocumentosNoConfiguradosError,
  SinResidenciaVigenteError,
  TitularDadoDeBajaError,
} from "../domain";
import type { ContadorDeFolios, RepositorioDeConstancias } from "./puertos";
import type {
  DireccionLeida,
  LecturaDeDirecciones,
  LecturaDeTitulares,
  RepositorioDeDocumentos,
  TitularLeido,
} from "./puertosDeLectura";

/**
 * Puertos mockeados, mismo patron que
 * `territorio/application/direccionVigenteDePersona.test.ts`: las lecturas
 * de otro modulo entran como una fabrica `(contexto) => puerto`, no como un
 * puerto ya construido, porque el contexto no se conoce hasta que se llama
 * a `emitirConstancia`. La prueba real del contador contra Postgres es
 * `folio.integration.test.ts` (design.md de `constancias-oficios`,
 * seccion 10), no este archivo.
 */
const withTenantMock = vi.hoisted(() => vi.fn());
const registrarMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));
vi.mock("@/shared/tenancy/bitacora", () => ({
  registrar: registrarMock,
}));

const { crearEmitirConstancia } = await import("./emitirConstancia");

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const personaId = "11111111-1111-4111-8111-111111111111";

describe("emitirConstancia", () => {
  const repositorio: RepositorioDeConstancias = {
    guardar: vi.fn(),
    buscarPorId: vi.fn(),
    listar: vi.fn(),
    paraValidar: vi.fn(),
    registrarReimpresion: vi.fn(),
    cancelar: vi.fn(),
  };
  const contador: ContadorDeFolios = { siguiente: vi.fn() };
  const repositorioDeDocumentos: RepositorioDeDocumentos = {
    leer: vi.fn(),
    escribir: vi.fn(),
  };

  let lecturaDeTitulares: LecturaDeTitulares;
  let lecturaDeDirecciones: LecturaDeDirecciones;
  let crearLecturaDeTitulares: (contexto: ContextoActual) => LecturaDeTitulares;
  let crearLecturaDeDirecciones: (
    contexto: ContextoActual,
  ) => LecturaDeDirecciones;

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
    lecturaDeTitulares = { porId: vi.fn() };
    lecturaDeDirecciones = { vigenteDe: vi.fn() };
    crearLecturaDeTitulares = vi.fn(() => lecturaDeTitulares);
    crearLecturaDeDirecciones = vi.fn(() => lecturaDeDirecciones);
  });

  const emitirConstancia = () =>
    crearEmitirConstancia(
      repositorio,
      contador,
      repositorioDeDocumentos,
      crearLecturaDeTitulares,
      crearLecturaDeDirecciones,
    );

  it("rechaza sin puedeEscribir(rol) antes de llamar cualquier puerto", async () => {
    await expect(
      emitirConstancia()(personaId, contextoCon("CONSULTA")),
    ).rejects.toBeInstanceOf(NoAutorizadoError);

    expect(lecturaDeTitulares.porId).not.toHaveBeenCalled();
    expect(withTenantMock).not.toHaveBeenCalled();
  });

  it("titular inexistente -> NoEncontradoError, sin abrir withTenant ni tocar el contador", async () => {
    vi.mocked(lecturaDeTitulares.porId).mockResolvedValue(null);

    await expect(
      emitirConstancia()(personaId, contextoCon("OPERADOR")),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    expect(withTenantMock).not.toHaveBeenCalled();
    expect(contador.siguiente).not.toHaveBeenCalled();
  });

  it("titular dado de baja -> TitularDadoDeBajaError, sin abrir withTenant", async () => {
    vi.mocked(lecturaDeTitulares.porId).mockResolvedValue({
      nombreCompleto: "Juan Poot",
      bajaEn: new Date("2024-01-01T00:00:00Z"),
    });

    await expect(
      emitirConstancia()(personaId, contextoCon("OPERADOR")),
    ).rejects.toBeInstanceOf(TitularDadoDeBajaError);

    expect(withTenantMock).not.toHaveBeenCalled();
    expect(contador.siguiente).not.toHaveBeenCalled();
  });

  it("sin residencia vigente -> SinResidenciaVigenteError, sin abrir withTenant", async () => {
    vi.mocked(lecturaDeTitulares.porId).mockResolvedValue({
      nombreCompleto: "Juan Poot",
      bajaEn: null,
    });
    vi.mocked(lecturaDeDirecciones.vigenteDe).mockResolvedValue(null);

    await expect(
      emitirConstancia()(personaId, contextoCon("OPERADOR")),
    ).rejects.toBeInstanceOf(SinResidenciaVigenteError);

    expect(withTenantMock).not.toHaveBeenCalled();
    expect(contador.siguiente).not.toHaveBeenCalled();
  });

  it("sin bloque de firma configurado -> DocumentosNoConfiguradosError, y el contador nunca se invoca", async () => {
    vi.mocked(lecturaDeTitulares.porId).mockResolvedValue({
      nombreCompleto: "Juan Poot",
      bajaEn: null,
    });
    vi.mocked(lecturaDeDirecciones.vigenteDe).mockResolvedValue({
      texto: "Calle 20 #10",
      residenciaId: "residencia-1",
      desdeEn: "2024-01-01",
    });
    vi.mocked(repositorioDeDocumentos.leer).mockResolvedValue(null);

    await expect(
      emitirConstancia()(personaId, contextoCon("OPERADOR")),
    ).rejects.toBeInstanceOf(DocumentosNoConfiguradosError);

    expect(contador.siguiente).not.toHaveBeenCalled();
    expect(repositorio.guardar).not.toHaveBeenCalled();
  });

  it("camino feliz: guardar recibe el snapshot compuesto y registrar recibe solo ids, en la misma transaccion", async () => {
    const titular: TitularLeido = {
      nombreCompleto: "Juan Poot",
      bajaEn: null,
    };
    const direccion: DireccionLeida = {
      texto: "Calle 20 #10",
      residenciaId: "residencia-1",
      desdeEn: "2024-01-01",
    };
    vi.mocked(lecturaDeTitulares.porId).mockResolvedValue(titular);
    vi.mocked(lecturaDeDirecciones.vigenteDe).mockResolvedValue(direccion);
    vi.mocked(repositorioDeDocumentos.leer).mockResolvedValue({
      firmanteNombre: "Maria Poot",
      firmanteCargo: "Secretaria Municipal",
      leyendaDePie: "Documento sin validez fiscal.",
    });
    vi.mocked(contador.siguiente).mockResolvedValue(1);

    await emitirConstancia()(personaId, contextoCon("OPERADOR"));

    expect(withTenantMock).toHaveBeenCalledTimes(1);
    expect(repositorio.guardar).toHaveBeenCalledTimes(1);

    const guardado = vi.mocked(repositorio.guardar).mock.calls[0]?.[1];
    expect(guardado?.personaId).toBe(personaId);
    expect(guardado?.tipo).toBe("VECINDAD");
    expect(guardado?.folio).toMatch(/^VEC-\d{4}-000001$/);
    expect(guardado?.datos).toEqual({
      titular: { nombreCompleto: "Juan Poot" },
      direccion: {
        texto: "Calle 20 #10",
        residenciaId: "residencia-1",
        desdeEn: "2024-01-01",
      },
      firmante: { nombre: "Maria Poot", cargo: "Secretaria Municipal" },
      leyendaDePie: "Documento sin validez fiscal.",
    });

    expect(registrarMock).toHaveBeenCalledTimes(1);
    expect(registrarMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        accion: "EMITIR_CONSTANCIA",
        entidad: "constancias",
        entidadId: guardado?.id,
      }),
    );

    // Lo que protege el invariante 2: las lecturas que pueden rechazar
    // corren antes que el contador, aunque las dos terminen aceptando.
    expect(
      vi.mocked(lecturaDeTitulares.porId).mock.invocationCallOrder[0],
    ).toBeLessThan(vi.mocked(contador.siguiente).mock.invocationCallOrder[0]!);
    expect(
      vi.mocked(lecturaDeDirecciones.vigenteDe).mock.invocationCallOrder[0],
    ).toBeLessThan(vi.mocked(contador.siguiente).mock.invocationCallOrder[0]!);
  });
});
