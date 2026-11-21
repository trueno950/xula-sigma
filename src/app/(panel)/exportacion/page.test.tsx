import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * La pantalla de exportacion en sus estados (S12-S16 de
 * `marca-exportacion-ux`): sin permiso conserva el encabezado del panel y dice
 * que rol hace falta (S15, S16); un fallo de la descarga se lee adentro del
 * panel (S13); la bitacora no promete una pantalla que no existe (S14).
 *
 * El inventario —la lista de conjuntos y los conteos— tiene su archivo:
 * `page.inventario.test.tsx`.
 */

const contextoActualMock = vi.hoisted(() => vi.fn());
const inventarioMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("@/app/exportacion/inventarioDeExportacion", () => ({
  inventarioDeExportacion: inventarioMock,
}));

const { default: PaginaDeExportacion } = await import("./page");
const { MENSAJES_DE_DESCARGA } = await import("./mensajesDeDescarga");

const contexto = {
  ayuntamientoId: "11111111-1111-4111-8111-111111111111",
  usuario: { id: "usuario-1", rol: "ADMIN_MUNICIPAL" as const },
  origen: "https://motul.xulasigma.mx",
};

const ARCHIVO = "motul-2026-11-21.zip";

const inventario = {
  archivo: ARCHIVO,
  tieneEscudo: false,
  conjuntos: [
    { nombre: "usuarios", filas: 8 },
    { nombre: "bitacora", filas: 3412 },
  ],
};

const pintar = async (
  parametros: Record<string, string | string[] | undefined> = {},
): Promise<string> =>
  renderToStaticMarkup(
    await PaginaDeExportacion({ searchParams: Promise.resolve(parametros) }),
  );

const comoOperador = () => {
  contextoActualMock.mockResolvedValue({
    ...contexto,
    usuario: { id: "usuario-2", rol: "OPERADOR" as const },
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  contextoActualMock.mockResolvedValue(contexto);
  inventarioMock.mockResolvedValue(inventario);
});

describe("sin permiso (S15, S16)", () => {
  it("conserva el encabezado del panel y no lee el inventario", async () => {
    comoOperador();

    const html = await pintar();

    expect(html).toContain("Exportación");
    expect(html).toContain("Todo lo que este ayuntamiento tiene");
    expect(inventarioMock).not.toHaveBeenCalled();
  });

  it("dice que rol hace falta y a quien pedirlo", async () => {
    comoOperador();

    const html = await pintar();

    expect(html).toContain(
      "Su rol no tiene permiso para exportar los datos del ayuntamiento.",
    );
    expect(html).toContain("Operador");
    expect(html).toContain("administrador municipal");
    expect(html).toContain('href="/padron"');
    expect(html).not.toContain('href="/exportacion/descarga"');
  });

  it("sin sesion no hay rol que nombrar y no se lee nada", async () => {
    contextoActualMock.mockResolvedValue(null);

    const html = await pintar();

    expect(html).toContain(
      "Su rol no tiene permiso para exportar los datos del ayuntamiento.",
    );
    expect(inventarioMock).not.toHaveBeenCalled();
  });
});

describe("el archivo que se descarga (S12)", () => {
  it("nombra el archivo y dice que se arma al pedirlo", async () => {
    const html = await pintar();

    expect(html).toContain(ARCHIVO);
    expect(html).toContain("se arma al pedirlo");
  });

  it("la descarga es un enlace nativo al borde que ya existe", async () => {
    const html = await pintar();

    expect(html).toContain('href="/exportacion/descarga"');
  });
});

describe("cuando la descarga falla (S13)", () => {
  it("el codigo del borde se pinta dentro del panel, con el boton para reintentar", async () => {
    const html = await pintar({ error: "fallo" });

    expect(html).toContain(MENSAJES_DE_DESCARGA.fallo);
    expect(html).toContain('href="/exportacion/descarga"');
    expect(html).toContain("Exportación");
  });

  it("texto que no es un codigo no se pinta: la URL no es una fuente de texto", async () => {
    const html = await pintar({ error: "<b>Su sesión expiró</b>" });

    expect(html).not.toContain("Su sesión expiró");
    expect(html).not.toContain("<b>");
  });

  it("un parametro repetido tampoco inventa un codigo", async () => {
    const html = await pintar({ error: ["fallo", "sin-permiso"] });

    expect(html).not.toContain(MENSAJES_DE_DESCARGA.fallo);
  });
});

describe("la bitacora (S14)", () => {
  it("no promete una pantalla que no existe y dice donde queda el registro", async () => {
    const html = await pintar();

    expect(html).toContain("No tiene pantalla en el panel");
    expect(html).toContain("se lee en el");
    expect(html).not.toContain("consulte la bitácora en el panel");
  });
});
