import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoEncontradoError } from "@/shared/lib/errores";
import type {
  DireccionLeida,
  LecturaDeAyuntamiento,
  RepositorioDeDocumentos,
  TitularLeido,
} from "./puertosDeLectura";
import { crearVistaPreviaDeConstancia } from "./vistaPreviaDeConstancia";

const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "OPERADOR" },
  origen: "web",
};

const TITULAR: TitularLeido = {
  nombreCompleto: "Guadalupe Kumul Poot",
  bajaEn: null,
};

const DIRECCION: DireccionLeida = {
  texto: "Calle 20 101, Colonia Centro, Motul",
  residenciaId: "residencia-1",
  desdeEn: "2026-10-01",
};

const DOCUMENTOS = {
  firmanteNombre: "Maria Poot",
  firmanteCargo: "Secretaria Municipal",
  leyendaDePie: "Documento gratuito",
};

type Escenario = {
  titular?: TitularLeido | null;
  direccion?: DireccionLeida | null;
  datos?: unknown;
};

const armar = ({
  titular = TITULAR,
  direccion = DIRECCION,
  datos = DOCUMENTOS,
}: Escenario = {}) => {
  const repositorio: RepositorioDeDocumentos = {
    leer: vi.fn().mockResolvedValue(datos),
    escribir: vi.fn(),
  };
  const ayuntamiento: LecturaDeAyuntamiento = {
    porId: vi.fn().mockResolvedValue({
      nombre: "H. Ayuntamiento de Motul",
      subdominio: "motul",
    }),
  };

  return crearVistaPreviaDeConstancia({
    documentos: repositorio,
    ayuntamiento,
    crearLecturaDeTitulares: () => ({
      porId: vi.fn().mockResolvedValue(titular),
    }),
    crearLecturaDeDirecciones: () => ({
      vigenteDe: vi.fn().mockResolvedValue(direccion),
    }),
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  withTenantMock.mockImplementation(
    (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
  );
});

describe("vistaPreviaDeConstancia", () => {
  /**
   * S5: la vista previa y la emision leen lo mismo (`LecturaDeTitulares` y
   * `LecturaDeDirecciones`), mas el bloque de firma que guarda el
   * ayuntamiento. Si dijera otra cosa que el PDF, dejaria de ser una vista
   * previa.
   */
  it("junta titular, direccion, firmante y municipio para la hoja", async () => {
    const resultado = await armar()("persona-1", contexto);

    expect(resultado).toEqual({
      clase: "vista",
      vista: {
        municipio: "H. Ayuntamiento de Motul",
        titular: { nombreCompleto: "Guadalupe Kumul Poot" },
        direccion: {
          texto: "Calle 20 101, Colonia Centro, Motul",
          desdeEn: "2026-10-01",
        },
        firmante: {
          nombre: "Maria Poot",
          cargo: "Secretaria Municipal",
          leyendaDePie: "Documento gratuito",
        },
      },
    });
  });

  it("sin residencia vigente la hoja se queda sin direccion", async () => {
    const resultado = await armar({ direccion: null })("persona-1", contexto);

    expect(resultado).toMatchObject({ vista: { direccion: null } });
  });

  /**
   * Sin bloque de firma no se emite (`DocumentosNoConfiguradosError`), y la
   * pantalla tiene que decirlo antes de confirmar en vez de despues. El
   * `firmante` nulo es la senal; degradar a un valor por defecto
   * renderizaria una hoja sin quien firma.
   */
  it("sin bloque de firma el firmante es nulo", async () => {
    const resultado = await armar({ datos: {} })("persona-1", contexto);

    expect(resultado).toMatchObject({ vista: { firmante: null } });
  });

  /** Regla 8: una persona inexistente o de otro municipio no existe para esta pantalla. */
  it("un titular inexistente es NoEncontradoError", async () => {
    await expect(
      armar({ titular: null })("persona-1", contexto),
    ).rejects.toBeInstanceOf(NoEncontradoError);
  });

  /**
   * S4: a quien esta dado de baja no se le emite, y la pantalla tiene que
   * poder decirlo con una salida en vez de con un 500. Es una respuesta, no
   * una excepcion.
   */
  it("un titular dado de baja se informa y no se arma la hoja", async () => {
    const resultado = await armar({
      titular: { nombreCompleto: "Guadalupe Kumul Poot", bajaEn: new Date() },
    })("persona-1", contexto);

    expect(resultado).toEqual({ clase: "titular-dado-de-baja" });
  });
});
