import { beforeEach, describe, expect, it, vi } from "vitest";
import { NoEncontradoError } from "@/shared/lib/errores";
import {
  CALLE,
  contexto,
  formDataDe,
  ID,
  LUGAR,
  redireccionDe,
  tokenGuardadoDe,
} from "./altaDeIntervencionAction.fixturas";

/**
 * S7 y S8 de `intervenciones-ux`: el mínimo de la descripción lo hace cumplir
 * el servidor y lo dice en español, y todo rechazo vuelve con lo capturado en
 * una cookie cuyo token -y nada más- viaja en la URL.
 */
const redirectMock = vi.hoisted(() =>
  vi.fn((_url?: string): never => {
    throw new Error("NEXT_REDIRECT");
  }),
);
const contextoActualMock = vi.hoisted(() => vi.fn());
const registrarMock = vi.hoisted(() => vi.fn());
const guardarBorradorMock = vi.hoisted(() => vi.fn());
const descartarBorradorMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("../../composicion", () => ({
  registrarIntervencion: registrarMock,
}));
vi.mock("../borradorEnCookie", () => ({
  guardarBorrador: guardarBorradorMock,
  descartarBorrador: descartarBorradorMock,
}));

const { altaDeIntervencionAction } = await import("./altaDeIntervencionAction");

const DESCRIPCION_CORTA = "La descripción debe tener al menos 10 caracteres.";

const redireccion = () => redireccionDe(redirectMock);
const tokenGuardado = () => tokenGuardadoDe(guardarBorradorMock) as string;

beforeEach(() => {
  vi.clearAllMocks();
  redirectMock.mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  });
  guardarBorradorMock.mockResolvedValue(undefined);
  descartarBorradorMock.mockResolvedValue(undefined);
  contextoActualMock.mockResolvedValue(contexto("ADMIN_MUNICIPAL"));
  registrarMock.mockResolvedValue(ID);
});

describe("alta de intervención: el borrador del rechazo", () => {
  it("una descripción corta vuelve con lo capturado y el error en español", async () => {
    const descripcion = "Bache";

    await expect(
      altaDeIntervencionAction(formDataDe({ descripcion })),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(registrarMock).not.toHaveBeenCalled();
    expect(guardarBorradorMock).toHaveBeenCalledTimes(1);
    expect(tokenGuardado()).toMatch(/^[0-9a-f-]{36}$/);
    expect(redireccion()).toBe(
      `/intervenciones/alta?borrador=${tokenGuardado()}&error=${DESCRIPCION_CORTA}`,
    );
    // La descripción no viaja en la URL: queda en el historial y en el log.
    expect(redireccion()).not.toContain(descripcion);
  });

  it("lo capturado se guarda entero, con la calle y la fecha que se enviaron", async () => {
    await expect(
      altaDeIntervencionAction(
        formDataDe({ descripcion: "Bache", fechaDeOcurrencia: "2026-03-02" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(guardarBorradorMock).toHaveBeenCalledWith({
      token: tokenGuardado(),
      campos: {
        tipo: "PAVIMENTACION",
        lugarId: LUGAR,
        calleId: CALLE,
        fechaDeOcurrencia: "2026-03-02",
        descripcion: "Bache",
      },
    });
  });

  it("un rechazo del caso de uso también vuelve con lo capturado", async () => {
    registrarMock.mockRejectedValue(new NoEncontradoError("interno"));

    await expect(altaDeIntervencionAction(formDataDe())).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(guardarBorradorMock).toHaveBeenCalledTimes(1);
    expect(redireccion()).toBe(
      `/intervenciones/alta?borrador=${tokenGuardado()}&error=Ese lugar o esa calle no existe en su municipio.`,
    );
  });

  it("el borde del mínimo: 9 caracteres se rechaza y 10 registra", async () => {
    await expect(
      altaDeIntervencionAction(formDataDe({ descripcion: "a".repeat(9) })),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(registrarMock).not.toHaveBeenCalled();
    expect(redireccion()).toContain(DESCRIPCION_CORTA);

    redirectMock.mockClear();

    await expect(
      altaDeIntervencionAction(formDataDe({ descripcion: "a".repeat(10) })),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(registrarMock).toHaveBeenCalledTimes(1);
    expect(redirectMock).toHaveBeenLastCalledWith(`/intervenciones/${ID}`);
  });

  it("el alta exitosa borra el borrador y no escribe uno nuevo", async () => {
    await expect(altaDeIntervencionAction(formDataDe())).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(guardarBorradorMock).not.toHaveBeenCalled();
    expect(descartarBorradorMock).toHaveBeenCalledTimes(1);
    expect(redirectMock).toHaveBeenLastCalledWith(`/intervenciones/${ID}`);
  });
});
