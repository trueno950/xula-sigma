import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.hoisted(() =>
  vi.fn((): never => {
    throw new Error("NEXT_REDIRECT");
  }),
);
const contextoActualMock = vi.hoisted(() => vi.fn());
const listarReportesMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
  usePathname: () => null,
}));
vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("@/shared/tenancy/contexto", () => ({
  ayuntamientoActual: async () => ({ nombre: "Motul" }),
}));

vi.mock("@/modules/reportes", () => ({ listarReportes: listarReportesMock }));

const { default: PaginaDeInicio } = await import("./page");
const { NavegacionDeModulos } = await import("../(panel)/NavegacionDeModulos");

const pintar = async () => renderToStaticMarkup(await PaginaDeInicio());

const enlaces = (html: string) =>
  [...html.matchAll(/<a[^>]*href="([^"]+)"/g)].map((m) => m[1]);

describe("inicio del municipio", () => {
  beforeEach(() => {
    contextoActualMock.mockReset();
    listarReportesMock.mockReset();
    listarReportesMock.mockResolvedValue({ reportes: [], hayMas: false });
    contextoActualMock.mockResolvedValue({
      usuario: { id: "u1", rol: "ADMIN_MUNICIPAL" },
    });
  });

  it("enlaza los mismos modulos que la navegacion del panel", async () => {
    const delHub = enlaces(await pintar());
    const delPanel = enlaces(
      renderToStaticMarkup(
        <NavegacionDeModulos ruta="/" rol="ADMIN_MUNICIPAL" />,
      ),
    );

    expect(delPanel).toContain("/mapa-operativo");
    expect(delPanel).toContain("/reportes");
    expect(delPanel).toContain("/intervenciones");
    expect(delHub).toEqual(delPanel);
  });

  it("la tarjeta de modulo es accionable y usa el lienzo del sistema", async () => {
    const html = await pintar();
    const tarjetaDePadron =
      [...html.matchAll(/<a\b[^>]*>/g)]
        .map((etiqueta) => etiqueta[0])
        .find((etiqueta) => etiqueta.includes('href="/padron"')) ?? "";

    expect(tarjetaDePadron).toContain("bg-caliza-lienzo");
    expect(tarjetaDePadron).toContain("hover:shadow-elevada");
    expect(tarjetaDePadron).not.toContain("bg-white");
  });

  it("dice el rol como lo dice el panel, no como lo guarda la base", async () => {
    const html = await pintar();

    expect(html).toContain("Administrador");
    expect(html).not.toContain("ADMIN_MUNICIPAL");
  });

  it("ofrece cerrar la sesion", async () => {
    expect(await pintar()).toContain("Cerrar sesión");
  });

  it("sin sesion manda a la pantalla de acceso", async () => {
    contextoActualMock.mockResolvedValue(null);

    await expect(pintar()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/acceso");
  });

  it("agrupa los modulos por area, con un encabezado por grupo", async () => {
    const html = await pintar();

    for (const grupo of ["Atención", "Territorio", "Administración"]) {
      expect(html).toContain(`>${grupo}</h2>`);
    }
  });

  it("no muestra al operador lo que no puede abrir ni el grupo vacio", async () => {
    contextoActualMock.mockResolvedValue({
      usuario: { id: "u2", rol: "OPERADOR" },
    });
    const html = await pintar();

    expect(enlaces(html)).not.toContain("/marca");
    expect(html).not.toContain("Administración");
  });

  it("pone el padron primero y mas ancho", async () => {
    const html = await pintar();

    expect(html).toMatch(
      /<li class="[^"]*sm:col-span-2[^"]*"><a[^>]*href="\/padron"/,
    );
    expect(enlaces(html)[0]).toBe("/padron");
  });

  it("no pinta pendientes cuando no hay nada por atender", async () => {
    const html = await pintar();

    expect(html).not.toContain("Pendientes de hoy");
    expect(enlaces(html)).not.toContain("/reportes?estado=RECIBIDO");
  });

  it("lista los reportes recibidos con su conteo y enlaza al listado filtrado", async () => {
    listarReportesMock.mockResolvedValue({
      reportes: [{}, {}, {}],
      hayMas: false,
    });
    const html = await pintar();

    expect(html).toContain("Pendientes de hoy");
    expect(html).toContain("Reportes recibidos sin atender");
    expect(html).toMatch(/tabular-nums[^>]*>3</);
    expect(enlaces(html)).toContain("/reportes?estado=RECIBIDO");
    expect(listarReportesMock.mock.calls[0]?.[0]).toEqual({
      estado: "RECIBIDO",
    });
  });

  it("marca el conteo como parcial cuando hay mas de una pagina", async () => {
    listarReportesMock.mockResolvedValue({
      reportes: Array.from({ length: 50 }, () => ({})),
      hayMas: true,
    });

    expect(await pintar()).toContain(">50+<");
  });

  it("sin poder contar los reportes, pinta el inicio sin pendientes y registra el fallo sin datos personales", async () => {
    const consola = vi.spyOn(console, "error").mockImplementation(() => {});
    listarReportesMock.mockRejectedValue(
      new Error("CURP ABCD123456HYNXXX00 fuera de linea"),
    );

    try {
      const html = await pintar();

      expect(html).toContain("Atención");
      expect(html).not.toContain("Pendientes de hoy");
      expect(consola).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(consola.mock.calls)).not.toContain("ABCD123456");
    } finally {
      consola.mockRestore();
    }
  });

  it("saluda segun la hora de Merida, no la del proceso", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-10-03T03:00:00.000Z"));
      expect(await pintar()).toContain("Buenas noches");

      vi.setSystemTime(new Date("2026-10-03T15:00:00.000Z"));
      expect(await pintar()).toContain("Buenos días");
    } finally {
      vi.useRealTimers();
    }
  });
});
