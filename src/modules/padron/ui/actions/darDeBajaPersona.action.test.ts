import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";

const contextoActualMock = vi.hoisted(() => vi.fn());
const darDeBajaPersonaMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("../../composicion", () => ({
  darDeBajaPersona: darDeBajaPersonaMock,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((destino: string) => {
    throw new Error(`REDIRECT:${destino}`);
  }),
}));

const { darDeBajaPersonaAction } = await import("./darDeBajaPersona.action");

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "OPERADOR" },
  origen: "web",
};

const PERSONA = "11111111-1111-4111-8111-111111111111";

const formulario = (personaId: string = PERSONA) => {
  const formData = new FormData();
  formData.set("personaId", personaId);
  return formData;
};

const alAdministrarDeLaFicha = (mensaje: string) =>
  `REDIRECT:/padron/${PERSONA}?pestana=administrar&error=${encodeURIComponent(mensaje)}`;

describe("darDeBajaPersonaAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    contextoActualMock.mockResolvedValue(contexto);
  });

  it("una baja exitosa vuelve al listado del padron", async () => {
    await expect(darDeBajaPersonaAction(formulario())).rejects.toThrow(
      "REDIRECT:/padron",
    );

    expect(darDeBajaPersonaMock).toHaveBeenCalledWith(PERSONA, contexto);
  });

  it("el municipio sale del contexto del servidor, nunca del formulario", async () => {
    const formData = formulario();
    formData.set("ayuntamientoId", "otro-municipio");

    await expect(darDeBajaPersonaAction(formData)).rejects.toThrow(
      "REDIRECT:/padron",
    );

    expect(darDeBajaPersonaMock).toHaveBeenCalledWith(PERSONA, contexto);
  });

  it.each([
    [
      "sin permiso de escritura",
      new NoAutorizadoError(),
      "No tiene permiso para esta operación.",
    ],
    [
      "la persona ya no existe",
      new NoEncontradoError(),
      "El recurso no existe.",
    ],
  ])(
    "un rechazo por %s vuelve a la ficha con su mensaje redactado",
    async (_caso, error, mensaje) => {
      darDeBajaPersonaMock.mockRejectedValue(error);

      await expect(darDeBajaPersonaAction(formulario())).rejects.toThrow(
        alAdministrarDeLaFicha(mensaje),
      );
    },
  );

  it("un error inesperado cae en el mensaje generico y queda en el log", async () => {
    const registro = vi.spyOn(console, "error").mockImplementation(() => {});
    darDeBajaPersonaMock.mockRejectedValue(new Error("conexion caida"));

    await expect(darDeBajaPersonaAction(formulario())).rejects.toThrow(
      alAdministrarDeLaFicha(
        "No se pudo dar de baja a la persona. Intente de nuevo.",
      ),
    );
    expect(registro).toHaveBeenCalled();
    registro.mockRestore();
  });

  it("sin una persona reconocible no hay ficha a la cual volver y cae al padron", async () => {
    await expect(
      darDeBajaPersonaAction(formulario("../territorio")),
    ).rejects.toThrow(
      `REDIRECT:/padron?error=${encodeURIComponent("No se pudo identificar a la persona.")}`,
    );

    expect(darDeBajaPersonaMock).not.toHaveBeenCalled();
  });
});
