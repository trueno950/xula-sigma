import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { CurpInvalidaError, PersonaInvalidaError } from "../../domain";

const contextoActualMock = vi.hoisted(() => vi.fn());
const editarPersonaMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("../../composicion", () => ({ editarPersona: editarPersonaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((destino: string) => {
    throw new Error(`REDIRECT:${destino}`);
  }),
}));

const { editarPersonaAction } = await import("./editarPersona.action");

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "OPERADOR" },
  origen: "web",
};

const PERSONA = "11111111-1111-4111-8111-111111111111";

const alAdministrarDeLaFicha = (mensaje: string) =>
  `REDIRECT:/padron/${PERSONA}?pestana=administrar&error=${encodeURIComponent(mensaje)}`;

const formulario = (cambios: Record<string, string> = {}) => {
  const formData = new FormData();
  formData.set("personaId", PERSONA);
  formData.set("nombres", "José Armando");
  formData.set("primerApellido", "May");
  formData.set("segundoApellido", "Canul");
  formData.set("curp", "MACA050312HYNSLL09");
  for (const [campo, valor] of Object.entries(cambios)) {
    formData.set(campo, valor);
  }
  return formData;
};

describe("editarPersonaAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    contextoActualMock.mockResolvedValue(contexto);
  });

  it("guardar los cambios vuelve a la ficha con la pestaña de Administrar abierta", async () => {
    await expect(editarPersonaAction(formulario())).rejects.toThrow(
      `REDIRECT:/padron/${PERSONA}?pestana=administrar`,
    );

    expect(editarPersonaMock).toHaveBeenCalledWith(
      PERSONA,
      {
        nombres: "José Armando",
        primerApellido: "May",
        segundoApellido: "Canul",
        curp: "MACA050312HYNSLL09",
      },
      contexto,
    );
  });

  it("un segundo apellido o una CURP en blanco se guardan como ausentes", async () => {
    await expect(
      editarPersonaAction(formulario({ segundoApellido: " ", curp: "" })),
    ).rejects.toThrow(`REDIRECT:/padron/${PERSONA}?pestana=administrar`);

    expect(editarPersonaMock).toHaveBeenCalledWith(
      PERSONA,
      {
        nombres: "José Armando",
        primerApellido: "May",
        segundoApellido: null,
        curp: null,
      },
      contexto,
    );
  });

  it("el municipio sale del contexto del servidor, nunca del formulario", async () => {
    await expect(
      editarPersonaAction(formulario({ ayuntamientoId: "otro-municipio" })),
    ).rejects.toThrow(`REDIRECT:/padron/${PERSONA}?pestana=administrar`);

    expect(editarPersonaMock).toHaveBeenCalledWith(
      PERSONA,
      expect.anything(),
      contexto,
    );
  });

  it("sin nombres no se llama al caso de uso y el error vuelve a la ficha", async () => {
    await expect(
      editarPersonaAction(formulario({ nombres: "  " })),
    ).rejects.toThrow(
      alAdministrarDeLaFicha("Nombres y primer apellido son obligatorios."),
    );

    expect(editarPersonaMock).not.toHaveBeenCalled();
  });

  it("sin una persona reconocible no hay ficha a la cual volver y cae al padron", async () => {
    await expect(
      editarPersonaAction(formulario({ personaId: "../territorio" })),
    ).rejects.toThrow(
      `REDIRECT:/padron?error=${encodeURIComponent("Nombres y primer apellido son obligatorios.")}`,
    );

    expect(editarPersonaMock).not.toHaveBeenCalled();
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
    [
      "los datos no forman una persona",
      new PersonaInvalidaError("El nombre es obligatorio."),
      "El nombre es obligatorio.",
    ],
    [
      "la CURP no tiene formato",
      new CurpInvalidaError(),
      "La CURP no tiene un formato válido.",
    ],
  ])(
    "un rechazo por %s muestra su mensaje ya redactado",
    async (_caso, error, mensaje) => {
      editarPersonaMock.mockRejectedValue(error);

      await expect(editarPersonaAction(formulario())).rejects.toThrow(
        alAdministrarDeLaFicha(mensaje),
      );
    },
  );

  it("un error inesperado cae en el mensaje generico y no en el texto de la excepcion", async () => {
    const registro = vi.spyOn(console, "error").mockImplementation(() => {});
    editarPersonaMock.mockRejectedValue(new Error("conexion caida"));

    await expect(editarPersonaAction(formulario())).rejects.toThrow(
      alAdministrarDeLaFicha(
        "No se pudieron guardar los cambios. Intente de nuevo.",
      ),
    );
    expect(registro).toHaveBeenCalled();
    registro.mockRestore();
  });
});
