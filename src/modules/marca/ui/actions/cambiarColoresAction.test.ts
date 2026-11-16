import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError, ValidacionError } from "@/shared/lib/errores";
import { PALETA } from "@/shared/marca";
import { MENSAJES_DE_ERROR_DE_MARCA } from "../mensajesDeMarca";

/**
 * El borde de la accion de colores (S8): valida la forma de la entrada,
 * resuelve el contexto y redacta el error con una oracion propia. El caso de
 * uso va mockeado —su comportamiento esta en `colores.integration.test.ts`—
 * y `redirect` tambien: lanzar es lo que hace en un request real, y aca
 * alcanza para ver a donde iba.
 */

const contextoActualMock = vi.fn<() => Promise<ContextoActual | null>>();
const cambiarColoresMock = vi.fn();
const revalidatePathMock = vi.fn();
const redirigirMock = vi.fn((ruta: string) => {
  throw new Error(`REDIRECT:${ruta}`);
});

vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("../../composicion", () => ({ cambiarColores: cambiarColoresMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("next/navigation", () => ({ redirect: redirigirMock }));

const { cambiarColoresAction } = await import("./cambiarColoresAction");

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "ADMIN_MUNICIPAL" },
  origen: "web",
};

const verde = PALETA.find(({ nombre }) => nombre === "Verde")?.valor ?? "";

const formulario = (campos: Record<string, string>): FormData => {
  const formData = new FormData();

  for (const [clave, valor] of Object.entries(campos)) {
    formData.set(clave, valor);
  }

  return formData;
};

/** El destino del `redirect`, con la consulta ya parseada. */
const destinoDelRedirect = (): URL => {
  const [ruta] = redirigirMock.mock.calls.at(-1) ?? [""];

  return new URL(ruta, "http://motul.xula.localhost");
};

const ejecutar = (campos: Record<string, string>) =>
  expect(cambiarColoresAction(formulario(campos))).rejects.toThrow("REDIRECT");

describe("cambiarColoresAction", () => {
  beforeEach(() => {
    contextoActualMock.mockReset();
    cambiarColoresMock.mockReset();
    revalidatePathMock.mockReset();
    redirigirMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sin sesion manda al acceso y no llama al caso de uso", async () => {
    contextoActualMock.mockResolvedValue(null);

    await ejecutar({ primario: verde, secundario: verde });

    expect(destinoDelRedirect().pathname).toBe("/acceso");
    expect(cambiarColoresMock).not.toHaveBeenCalled();
  });

  it("sin un color elegido avisa a la operadora y no llama al caso de uso", async () => {
    contextoActualMock.mockResolvedValue(contexto);

    await ejecutar({ primario: "", secundario: verde });

    expect(destinoDelRedirect().searchParams.get("error")).toBe(
      MENSAJES_DE_ERROR_DE_MARCA.formularioIncompleto,
    );
    expect(cambiarColoresMock).not.toHaveBeenCalled();
  });

  it("manda el color de la paleta y confirma el guardado", async () => {
    contextoActualMock.mockResolvedValue(contexto);
    cambiarColoresMock.mockResolvedValue({
      primario: verde,
      primarioTexto: "#ffffff",
      secundario: verde,
    });

    await ejecutar({ primario: verde, secundario: verde });

    expect(cambiarColoresMock).toHaveBeenCalledWith(
      { primario: verde, secundario: verde },
      contexto,
    );
    expect(destinoDelRedirect().searchParams.get("ok")).toBe(
      "colores-guardados",
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/marca");
  });

  it("toma el hex del selector libre cuando esta marcado Otro color", async () => {
    contextoActualMock.mockResolvedValue(contexto);
    cambiarColoresMock.mockResolvedValue({ ok: true });

    await ejecutar({
      primario: "libre",
      primarioLibre: "#123456",
      secundario: verde,
    });

    expect(cambiarColoresMock).toHaveBeenCalledWith(
      { primario: "#123456", secundario: verde },
      contexto,
    );
  });

  it("un permiso negado sale con la oracion de la pantalla, no con la de la excepcion", async () => {
    const negado = new NoAutorizadoError();
    contextoActualMock.mockResolvedValue(contexto);
    cambiarColoresMock.mockRejectedValue(negado);

    await ejecutar({ primario: verde, secundario: verde });

    const mensaje = destinoDelRedirect().searchParams.get("error");

    expect(mensaje).toBe(MENSAJES_DE_ERROR_DE_MARCA.sinPermiso);
    expect(mensaje).not.toBe(negado.message);
  });

  it("un color rechazado por la reja no filtra el detalle del campo", async () => {
    contextoActualMock.mockResolvedValue(contexto);
    cambiarColoresMock.mockRejectedValue(
      new ValidacionError({ primario: 'El valor de "primario" no es valido.' }),
    );

    await ejecutar({ primario: "oklch(0.5)", secundario: verde });

    const mensaje = destinoDelRedirect().searchParams.get("error");

    expect(mensaje).toBe(MENSAJES_DE_ERROR_DE_MARCA.colorInvalido);
    expect(mensaje).not.toContain("primario");
  });

  it("una caida inesperada no se traga ni se muestra cruda", async () => {
    const errorDeInfra = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    contextoActualMock.mockResolvedValue(contexto);
    cambiarColoresMock.mockRejectedValue(new Error("database is down"));

    await ejecutar({ primario: verde, secundario: verde });

    expect(destinoDelRedirect().searchParams.get("error")).toBe(
      MENSAJES_DE_ERROR_DE_MARCA.guardadoFallido,
    );
    expect(errorDeInfra).toHaveBeenCalled();
  });
});
