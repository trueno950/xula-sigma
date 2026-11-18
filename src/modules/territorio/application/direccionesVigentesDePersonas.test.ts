import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { comoDomicilioId } from "../domain";
import {
  domicilioAjeno,
  domicilioNuevo,
  domicilioViejo,
  partes,
  personaOtra,
  personaUna,
  residencia,
} from "./direccionesVigentesDePrueba";
import type { LectorDeDireccionesEnLote } from "./puertosDeDirecciones";
import type { RepositorioDeResidencias } from "./puertosDeResidencias";

const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearDireccionesVigentesDePersonas } = await import(
  "./direccionesVigentesDePersonas"
);

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "CONSULTA" },
  origen: "web",
};

describe("direccionesVigentesDePersonas", () => {
  const repositorio: RepositorioDeResidencias = {
    cerrarAbiertas: vi.fn(),
    abrir: vi.fn(),
    historialDe: vi.fn(),
    residentesDe: vi.fn(),
  };
  const lectorDeDirecciones: LectorDeDireccionesEnLote = {
    partesDeVarios: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
  });

  const direccionesVigentesDePersonas = () =>
    crearDireccionesVigentesDePersonas(repositorio, lectorDeDirecciones);

  it("sin ids devuelve un mapa vacio sin abrir withTenant", async () => {
    const direcciones = await direccionesVigentesDePersonas()([], contexto);

    expect(direcciones.size).toBe(0);
    expect(withTenantMock).not.toHaveBeenCalled();
  });

  it("etiqueta la residencia abierta como calle y numero, lugar y raiz", async () => {
    vi.mocked(repositorio.historialDe).mockResolvedValue([
      residencia({
        personaId: personaUna,
        domicilioId: domicilioNuevo,
        desdeEn: "2021-01-01",
      }),
    ]);
    vi.mocked(lectorDeDirecciones.partesDeVarios).mockResolvedValue(
      new Map([
        [
          comoDomicilioId(domicilioNuevo),
          partes("Calle 20", ["Colonia Centro", "Motul"]),
        ],
      ]),
    );

    const direcciones = await direccionesVigentesDePersonas()(
      [personaUna],
      contexto,
    );

    expect(direcciones.get(personaUna)).toBe(
      "Calle 20 #10, Colonia Centro, Motul",
    );
  });

  it("sin ancestros legibles etiqueta solo calle y numero", async () => {
    vi.mocked(repositorio.historialDe).mockResolvedValue([
      residencia({
        personaId: personaUna,
        domicilioId: domicilioNuevo,
        desdeEn: "2021-01-01",
      }),
    ]);
    vi.mocked(lectorDeDirecciones.partesDeVarios).mockResolvedValue(
      new Map([[comoDomicilioId(domicilioNuevo), partes("Calle 45", [])]]),
    );

    const direcciones = await direccionesVigentesDePersonas()(
      [personaUna],
      contexto,
    );

    expect(direcciones.get(personaUna)).toBe("Calle 45 #10");
  });

  it("ignora las residencias cerradas y deja fuera a quien no tiene ninguna abierta", async () => {
    vi.mocked(repositorio.historialDe).mockResolvedValue([
      residencia({
        personaId: personaOtra,
        domicilioId: domicilioViejo,
        desdeEn: "2023-01-01",
        hastaEn: "2024-01-01",
      }),
    ]);
    vi.mocked(lectorDeDirecciones.partesDeVarios).mockResolvedValue(new Map());

    const direcciones = await direccionesVigentesDePersonas()(
      [personaUna, personaOtra],
      contexto,
    );

    expect(direcciones.size).toBe(0);
    expect(lectorDeDirecciones.partesDeVarios).not.toHaveBeenCalled();
  });

  it("una sola lectura de residencias y una sola de direcciones para toda la pagina", async () => {
    vi.mocked(repositorio.historialDe).mockResolvedValue([
      residencia({
        personaId: personaUna,
        domicilioId: domicilioNuevo,
        desdeEn: "2021-01-01",
      }),
      residencia({
        personaId: personaOtra,
        domicilioId: domicilioViejo,
        desdeEn: "2020-01-01",
      }),
    ]);
    vi.mocked(lectorDeDirecciones.partesDeVarios).mockResolvedValue(new Map());

    await direccionesVigentesDePersonas()([personaUna, personaOtra], contexto);

    expect(repositorio.historialDe).toHaveBeenCalledTimes(1);
    expect(repositorio.historialDe).toHaveBeenCalledWith(expect.anything(), [
      personaUna,
      personaOtra,
    ]);
    expect(lectorDeDirecciones.partesDeVarios).toHaveBeenCalledTimes(1);
    expect(lectorDeDirecciones.partesDeVarios).toHaveBeenCalledWith(
      expect.anything(),
      [domicilioNuevo, domicilioViejo].map((id) => comoDomicilioId(id)),
    );
  });

  it("el domicilio que ya no se puede leer deja a su persona fuera del mapa", async () => {
    vi.mocked(repositorio.historialDe).mockResolvedValue([
      residencia({
        personaId: personaUna,
        domicilioId: domicilioAjeno,
        desdeEn: "2021-01-01",
      }),
      residencia({
        personaId: personaOtra,
        domicilioId: domicilioNuevo,
        desdeEn: "2020-01-01",
      }),
    ]);
    vi.mocked(lectorDeDirecciones.partesDeVarios).mockResolvedValue(
      new Map([
        [
          comoDomicilioId(domicilioNuevo),
          partes("Calle 20", ["Colonia Centro", "Motul"]),
        ],
      ]),
    );

    const direcciones = await direccionesVigentesDePersonas()(
      [personaUna, personaOtra],
      contexto,
    );

    expect(direcciones.has(personaUna)).toBe(false);
    expect(direcciones.get(personaOtra)).toContain("Calle 20");
  });
});
