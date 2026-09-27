import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoEncontradoError } from "@/shared/lib/errores";

/**
 * Borde de ruta: los tres puertos que decide el request -cabecera, sesion,
 * caso de uso- mockeados, forma de `route.test.ts` de
 * `api/auth/[...all]`. `notFound()` se mockea lanzando -mismo
 * comportamiento que la real de `next/navigation`, que no devuelve- para
 * que el control de flujo del handler se comporte igual que en produccion.
 */
const leerCabeceras = vi.hoisted(() => vi.fn());
const contextoActualMock = vi.hoisted(() => vi.fn());
const pdfDeConstanciaMock = vi.hoisted(() => vi.fn());
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
vi.mock("@/modules/constancias", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/modules/constancias")>();
  return {
    comoConstanciaId: real.comoConstanciaId,
    pdfDeConstancia: pdfDeConstanciaMock,
  };
});

const { GET } = await import("./route");

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "OPERADOR" },
  origen: "web",
};

const constanciaId = "11111111-1111-4111-8111-111111111111";

const conCabecera = (valor: string | null) => {
  leerCabeceras.mockResolvedValue({ get: () => valor });
};

const paramsDe = (id: string) => Promise.resolve({ id });

describe("GET /constancias/[id]/pdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    conCabecera("ayuntamiento");
    contextoActualMock.mockResolvedValue(contexto);
  });

  it("fuera de la superficie de ayuntamiento -> notFound(), sin llamar al caso de uso", async () => {
    conCabecera("raiz");

    await expect(
      GET(new Request(`http://x/constancias/${constanciaId}/pdf`), {
        params: paramsDe(constanciaId),
      }),
    ).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");

    expect(contextoActualMock).not.toHaveBeenCalled();
    expect(pdfDeConstanciaMock).not.toHaveBeenCalled();
  });

  it("sin sesion -> 401, sin llamar al caso de uso", async () => {
    contextoActualMock.mockResolvedValue(null);

    const respuesta = await GET(
      new Request(`http://x/constancias/${constanciaId}/pdf`),
      { params: paramsDe(constanciaId) },
    );

    expect(respuesta.status).toBe(401);
    expect(pdfDeConstanciaMock).not.toHaveBeenCalled();
  });

  it("NoEncontradoError del caso de uso -> 404", async () => {
    pdfDeConstanciaMock.mockRejectedValue(new NoEncontradoError());

    const respuesta = await GET(
      new Request(`http://x/constancias/${constanciaId}/pdf`),
      { params: paramsDe(constanciaId) },
    );

    expect(respuesta.status).toBe(404);
  });

  it("camino feliz: cabeceras exactas y bytes del PDF", async () => {
    pdfDeConstanciaMock.mockResolvedValue({
      bytes: new Uint8Array([1, 2, 3]),
      folio: "VEC-2026-000001",
    });

    const respuesta = await GET(
      new Request(`http://x/constancias/${constanciaId}/pdf`),
      { params: paramsDe(constanciaId) },
    );

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("Content-Type")).toBe("application/pdf");
    expect(respuesta.headers.get("Content-Disposition")).toBe(
      'inline; filename="VEC-2026-000001.pdf"',
    );
    expect(respuesta.headers.get("Cache-Control")).toBe("no-store");
    expect(new Uint8Array(await respuesta.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3]),
    );
  });

  it("pasa el ?reimpresion= del query string al caso de uso", async () => {
    pdfDeConstanciaMock.mockResolvedValue({
      bytes: new Uint8Array([1]),
      folio: "VEC-2026-000001",
    });
    const reimpresionId = "22222222-2222-4222-8222-222222222222";

    await GET(
      new Request(
        `http://x/constancias/${constanciaId}/pdf?reimpresion=${reimpresionId}`,
      ),
      { params: paramsDe(constanciaId) },
    );

    expect(pdfDeConstanciaMock).toHaveBeenCalledWith(
      expect.objectContaining({ reimpresionId }),
      contexto,
    );
  });

  it("sin ?reimpresion= no manda la clave al caso de uso", async () => {
    pdfDeConstanciaMock.mockResolvedValue({
      bytes: new Uint8Array([1]),
      folio: "VEC-2026-000001",
    });

    await GET(new Request(`http://x/constancias/${constanciaId}/pdf`), {
      params: paramsDe(constanciaId),
    });

    const entrada = pdfDeConstanciaMock.mock.calls[0]?.[0];
    expect(entrada).not.toHaveProperty("reimpresionId");
  });
});
