import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import {
  NoAutorizadoError,
  NoEncontradoError,
  TenantNoResueltoError,
} from "@/shared/lib/errores";
import { comoAyuntamientoId } from "@/shared/tenancy/ayuntamientoId";

/**
 * Borde HTTP de la descarga (S6): superficie, sesion, rol, tenant y las
 * cabeceras de la respuesta. Los tres puertos que decide el request estan
 * mockeados —cabecera, sesion y el armado del ZIP—, misma forma que
 * `route.test.ts` de `constancias/[id]/pdf`.
 */
const leerCabeceras = vi.hoisted(() => vi.fn());
const contextoActualMock = vi.hoisted(() => vi.fn());
const descargaMock = vi.hoisted(() => vi.fn());
const notFoundMock = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  }),
);

vi.mock("next/headers", () => ({ headers: leerCabeceras }));
vi.mock("next/navigation", () => ({ notFound: notFoundMock }));
vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("@/shared/tenancy/contexto", () => ({
  exigirAyuntamiento: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/app/exportacion/descargaDeDatos", () => ({
  descargaDeDatos: descargaMock,
}));

const { GET } = await import("./route");

const contexto: ContextoActual = {
  ayuntamientoId: comoAyuntamientoId(randomUUID()),
  usuario: { id: "usuario-1", rol: "ADMIN_MUNICIPAL" },
  origen: "https://motul.xulasigma.mx",
};

const conCabecera = (valor: string | null) => {
  leerCabeceras.mockResolvedValue({ get: () => valor });
};

const ZIP = {
  bytes: new Uint8Array([1, 2, 3]),
  nombre: "motul-2026-11-13.zip",
};

describe("GET /exportacion/descarga", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    conCabecera("ayuntamiento");
    contextoActualMock.mockResolvedValue(contexto);
    descargaMock.mockResolvedValue(ZIP);
  });

  it("fuera de la superficie de ayuntamiento -> notFound(), sin tocar la sesion", async () => {
    conCabecera("raiz");

    await expect(GET()).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");

    expect(contextoActualMock).not.toHaveBeenCalled();
    expect(descargaMock).not.toHaveBeenCalled();
  });

  it("sin sesion -> 401, sin armar el ZIP", async () => {
    contextoActualMock.mockResolvedValue(null);

    const respuesta = await GET();

    expect(respuesta.status).toBe(401);
    expect(descargaMock).not.toHaveBeenCalled();
  });

  it("un rol sin permiso -> 403 con el mensaje para la operadora", async () => {
    descargaMock.mockRejectedValue(new NoAutorizadoError());

    const respuesta = await GET();

    expect(respuesta.status).toBe(403);
    expect(await respuesta.text()).toBe(
      "Su rol no tiene permiso para descargar los datos del ayuntamiento.",
    );
  });

  it("tenant que no resuelve -> 404", async () => {
    descargaMock.mockRejectedValue(new TenantNoResueltoError());

    expect((await GET()).status).toBe(404);
  });

  it("recurso que no existe -> 404", async () => {
    descargaMock.mockRejectedValue(new NoEncontradoError());

    expect((await GET()).status).toBe(404);
  });

  it("un fallo inesperado -> 500 con mensaje generico y sin datos en el log", async () => {
    const registro = vi.spyOn(console, "error").mockImplementation(() => {});
    descargaMock.mockRejectedValue(
      new Error("La persona de CURP MOPJ900101HYNXXX07 no se pudo leer"),
    );

    const respuesta = await GET();
    const cuerpo = await respuesta.text();

    expect(respuesta.status).toBe(500);
    expect(cuerpo).toBe(
      "No se pudo preparar la descarga. Vuelva a intentarlo en un momento.",
    );
    expect(cuerpo).not.toContain("CURP");
    expect(JSON.stringify(registro.mock.calls)).not.toContain("CURP");
    expect(JSON.stringify(registro.mock.calls)).not.toContain("MOPJ900101");
    registro.mockRestore();
  });

  it("camino feliz: cabeceras exactas y los bytes del ZIP", async () => {
    const respuesta = await GET();

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("Content-Type")).toBe("application/zip");
    expect(respuesta.headers.get("Content-Disposition")).toBe(
      'attachment; filename="motul-2026-11-13.zip"',
    );
    expect(respuesta.headers.get("Cache-Control")).toBe("no-store");
    expect(new Uint8Array(await respuesta.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3]),
    );
  });

  it("el contexto sale del servidor: la descarga lo recibe tal cual, sin query string", async () => {
    await GET();

    expect(descargaMock).toHaveBeenCalledWith(contexto);
    expect(descargaMock).toHaveBeenCalledTimes(1);
  });
});
