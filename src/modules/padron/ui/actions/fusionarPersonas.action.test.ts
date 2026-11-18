import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";

const contextoActualMock = vi.hoisted(() => vi.fn());
const fusionarPersonasMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("../../composicion", () => ({
  fusionarPersonas: fusionarPersonasMock,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((destino: string) => {
    throw new Error(`REDIRECT:${destino}`);
  }),
}));

const { fusionarPersonasAction } = await import("./fusionarPersonas.action");

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "ADMIN_MUNICIPAL" },
  origen: "web",
};

const PERDEDORA = "11111111-1111-4111-8111-111111111111";
const GANADORA = "22222222-2222-4222-8222-222222222222";

const formulario = (campos: Record<string, string>) => {
  const formData = new FormData();
  for (const [campo, valor] of Object.entries(campos)) {
    formData.set(campo, valor);
  }
  return formData;
};

const valido = () =>
  formulario({ perdedoraId: PERDEDORA, ganadoraId: GANADORA });

const enLaFichaDeLaGanadora = (mensaje: string) =>
  `REDIRECT:/padron/${GANADORA}?pestana=administrar&error=${encodeURIComponent(mensaje)}`;

describe("fusionarPersonasAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    contextoActualMock.mockResolvedValue(contexto);
  });

  it("una fusion exitosa vuelve a la ficha de la ganadora, sin error", async () => {
    await expect(fusionarPersonasAction(valido())).rejects.toThrow(
      `REDIRECT:/padron/${GANADORA}?pestana=administrar`,
    );

    expect(fusionarPersonasMock).toHaveBeenCalledWith(
      PERDEDORA,
      GANADORA,
      contexto,
    );
  });

  it("sin duplicado elegido pide elegirlo en la ficha y no fusiona", async () => {
    await expect(
      fusionarPersonasAction(formulario({ ganadoraId: GANADORA })),
    ).rejects.toThrow(
      enLaFichaDeLaGanadora("Seleccione la persona duplicada a fusionar."),
    );

    expect(fusionarPersonasMock).not.toHaveBeenCalled();
  });

  it("una ganadora que no es uuid vuelve al listado, nunca a una ruta armada con ella", async () => {
    await expect(
      fusionarPersonasAction(
        formulario({ perdedoraId: PERDEDORA, ganadoraId: "//evil.example" }),
      ),
    ).rejects.toThrow(
      `REDIRECT:/padron?error=${encodeURIComponent("Seleccione la persona duplicada a fusionar.")}`,
    );

    expect(fusionarPersonasMock).not.toHaveBeenCalled();
  });

  it.each([
    ["sin permiso", new NoAutorizadoError()],
    ["persona de otro municipio o inexistente", new NoEncontradoError()],
  ])("%s muestra el mensaje de la lista blanca", async (_caso, error) => {
    fusionarPersonasMock.mockRejectedValue(error);

    await expect(fusionarPersonasAction(valido())).rejects.toThrow(
      enLaFichaDeLaGanadora(error.message),
    );
  });

  it("una falla inesperada no expone su texto a la operadora", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    fusionarPersonasMock.mockRejectedValue(new Error("detalle interno"));

    await expect(fusionarPersonasAction(valido())).rejects.toThrow(
      enLaFichaDeLaGanadora(
        "No se pudo completar la fusión. Intente de nuevo.",
      ),
    );
  });

  it("sin sesion manda a acceso sin fusionar", async () => {
    contextoActualMock.mockResolvedValue(null);

    await expect(fusionarPersonasAction(valido())).rejects.toThrow(
      "REDIRECT:/acceso",
    );

    expect(fusionarPersonasMock).not.toHaveBeenCalled();
  });
});
