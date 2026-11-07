import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { CalleEnZonaError } from "../../domain";

const mocks = vi.hoisted(() => ({
  contextoActual: vi.fn(),
  darDeBajaCalle: vi.fn(),
}));

vi.mock("@/shared/auth", () => ({ contextoActual: mocks.contextoActual }));
vi.mock("../../composicion", () => ({ darDeBajaCalle: mocks.darDeBajaCalle }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (destino: string) => {
    throw new Error(`REDIRECT:${destino}`);
  },
}));

const { darDeBajaCalleAction } = await import("./darDeBajaCalleAction");

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "ADMIN_MUNICIPAL" },
  origen: "web",
};

const CALLE = "11111111-1111-4111-8111-111111111111";

const destinoDe = async (envio: Promise<void>): Promise<URL> => {
  const error = await envio.then(
    () => new Error("no redirigio"),
    (rechazo: unknown) => rechazo,
  );
  const mensaje = error instanceof Error ? error.message : "";
  return new URL(mensaje.replace("REDIRECT:", ""), "http://local");
};

describe("darDeBajaCalleAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.contextoActual.mockResolvedValue(contexto);
  });

  it("le muestra a la operadora el motivo cuando la calle esta en una zona", async () => {
    const enZona = new CalleEnZonaError(
      "Esta calle pertenece a una zona operativa. Quítela de la zona antes de darla de baja.",
    );
    mocks.darDeBajaCalle.mockRejectedValue(enZona);
    const formData = new FormData();
    formData.set("calleId", CALLE);

    const destino = await destinoDe(darDeBajaCalleAction(formData));

    expect(destino.searchParams.get("error")).toBe(enZona.message);
    expect(destino.searchParams.has("ok")).toBe(false);
  });
});
