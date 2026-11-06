import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { DomicilioConResidentesError } from "../../domain";

const RAIZ = "11111111-1111-4111-8111-111111111111";
const DOMICILIO = "33333333-3333-4333-8333-333333333333";

const contextoActualMock = vi.hoisted(() => vi.fn());
const darDeBajaDomicilioMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("../../composicion", () => ({
  darDeBajaDomicilio: darDeBajaDomicilioMock,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (destino: string) => {
    throw new Error(`REDIRECT:${destino}`);
  },
}));

const { darDeBajaDomicilioAction } = await import("./darDeBajaDomicilioAction");

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "ADMIN_MUNICIPAL" },
  origen: "web",
};

const enviarBaja = async () => {
  const formData = new FormData();
  formData.set("domicilioId", DOMICILIO);
  formData.set("raiz", RAIZ);
  formData.set("nodo", RAIZ);
  formData.set("vista", "domicilios");
  formData.set("accion", "bajaDomicilio");
  formData.set("domicilio", DOMICILIO);
  const error = await darDeBajaDomicilioAction(formData).catch(
    (caida: Error) => caida,
  );
  const destino = new URL(
    String(error?.message).replace("REDIRECT:", ""),
    "http://x",
  );

  return destino.searchParams;
};

describe("darDeBajaDomicilioAction: domicilio con residentes", () => {
  beforeEach(() => {
    contextoActualMock.mockResolvedValue(contexto);
    darDeBajaDomicilioMock.mockRejectedValue(new DomicilioConResidentesError());
  });

  it("el rechazo dice que primero se registra la mudanza de los residentes", async () => {
    const parametros = await enviarBaja();

    expect(parametros.get("error")).toBe(
      "Esta dirección tiene residentes vigentes. Registre primero la mudanza de cada uno desde su ficha del padrón y vuelva a dar de baja la dirección.",
    );
  });

  it("el rechazo vuelve con el panel del domicilio abierto, donde se ven sus residentes", async () => {
    const parametros = await enviarBaja();

    expect(parametros.get("domicilio")).toBe(DOMICILIO);
    expect(parametros.get("accion")).toBe("bajaDomicilio");
  });
});
