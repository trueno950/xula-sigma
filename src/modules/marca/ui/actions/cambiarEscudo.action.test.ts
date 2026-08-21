import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";

/**
 * `cambiarEscudo.action.ts` es la primera Server Action del repo. Este
 * test mockea `contextoActual` (no session/no rol de aqui, eso ya lo
 * cubre `roles.test.ts` y `cambiarEscudo.integration.test.ts`) y el caso
 * de uso ya cableado por `composicion.ts`, para probar solo lo que le toca
 * a esta capa: el borde de sesion y la forma del `FormData` de entrada
 * (design.md seccion 5, pasos 1-2).
 */

const contextoActualMock = vi.fn<() => Promise<ContextoActual | null>>();
const cambiarEscudoMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/shared/auth", () => ({
  contextoActual: contextoActualMock,
}));

vi.mock("../../composicion", () => ({
  cambiarEscudo: cambiarEscudoMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const { cambiarEscudoAction } = await import("./cambiarEscudo.action");

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "ADMIN_MUNICIPAL" },
  origen: "web",
};

const archivoPng = (bytes = 3) =>
  new File([new Uint8Array(bytes)], "escudo.png", { type: "image/png" });

describe("cambiarEscudoAction", () => {
  beforeEach(() => {
    contextoActualMock.mockReset();
    cambiarEscudoMock.mockReset();
    revalidatePathMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sin sesion responde NO_AUTORIZADO y no llama al caso de uso", async () => {
    contextoActualMock.mockResolvedValue(null);

    const formData = new FormData();
    formData.set("escudo", archivoPng());

    const resultado = await cambiarEscudoAction(formData);

    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error("se esperaba un fallo");
    expect(resultado.codigo).toBe("NO_AUTORIZADO");
    expect(cambiarEscudoMock).not.toHaveBeenCalled();
  });

  it("sin archivo responde VALIDACION nombrando el campo escudo", async () => {
    contextoActualMock.mockResolvedValue(contexto);

    const formData = new FormData();

    const resultado = await cambiarEscudoAction(formData);

    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error("se esperaba un fallo");
    expect(resultado.codigo).toBe("VALIDACION");
    expect(resultado.campos?.escudo).toBeDefined();
    expect(cambiarEscudoMock).not.toHaveBeenCalled();
  });

  it("un archivo de mas de 1 MiB responde VALIDACION nombrando el campo escudo", async () => {
    contextoActualMock.mockResolvedValue(contexto);

    const formData = new FormData();
    formData.set("escudo", archivoPng(1024 * 1024 + 1));

    const resultado = await cambiarEscudoAction(formData);

    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error("se esperaba un fallo");
    expect(resultado.codigo).toBe("VALIDACION");
    expect(resultado.campos?.escudo).toBeDefined();
    expect(cambiarEscudoMock).not.toHaveBeenCalled();
  });

  it("con sesion y archivo valido llama al caso de uso cableado y revalida", async () => {
    contextoActualMock.mockResolvedValue(contexto);
    cambiarEscudoMock.mockResolvedValue({
      escudo: "https://assets.xulasigma.mx/motul/escudo-x.png",
    });

    const formData = new FormData();
    formData.set("escudo", archivoPng());

    const resultado = await cambiarEscudoAction(formData);

    expect(resultado).toEqual({
      ok: true,
      data: { escudo: "https://assets.xulasigma.mx/motul/escudo-x.png" },
    });
    expect(cambiarEscudoMock).toHaveBeenCalledWith(
      { bytes: expect.any(Uint8Array) },
      contexto,
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/marca");
    expect(revalidatePathMock).toHaveBeenCalledWith("/acceso");
  });
});
