import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { MudanzaConcurrenteError } from "../../domain";

const contextoActualMock = vi.hoisted(() => vi.fn());
const registrarMudanzaMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("../../composicion", () => ({
  registrarMudanza: registrarMudanzaMock,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((destino: string) => {
    throw new Error(`REDIRECT:${destino}`);
  }),
}));

const { registrarMudanzaAction } = await import("./registrarMudanzaAction");

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "OPERADOR" },
  origen: "web",
};

const PERSONA = "11111111-1111-4111-8111-111111111111";
const DOMICILIO = "22222222-2222-4222-8222-222222222222";

const formulario = () => {
  const formData = new FormData();
  formData.set("personaId", PERSONA);
  formData.set("domicilioId", DOMICILIO);
  return formData;
};

const alDetalleCon = (mensaje: string) =>
  `REDIRECT:/padron/${PERSONA}?error=${encodeURIComponent(mensaje)}`;

describe("registrarMudanzaAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    contextoActualMock.mockResolvedValue(contexto);
  });

  it("una mudanza simultanea de la misma persona muestra a la operadora su propio mensaje", async () => {
    registrarMudanzaMock.mockRejectedValue(new MudanzaConcurrenteError());

    await expect(registrarMudanzaAction(formulario())).rejects.toThrow(
      alDetalleCon(
        "Ya se registró otra mudanza para esta persona al mismo tiempo. Revise el historial.",
      ),
    );
  });

  it("un error inesperado sigue cayendo en el mensaje generico", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    registrarMudanzaMock.mockRejectedValue(new Error("conexion caida"));

    await expect(registrarMudanzaAction(formulario())).rejects.toThrow(
      alDetalleCon("No se pudo completar la mudanza. Intente de nuevo."),
    );
  });
});
