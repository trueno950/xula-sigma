import { beforeEach, describe, expect, it, vi } from "vitest";

const contextoActualMock = vi.hoisted(() => vi.fn());
const registroDeDomiciliosMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("../../composicion", () => ({
  registroDeDomicilios: registroDeDomiciliosMock,
}));

const { buscarDomiciliosAction } = await import("./buscarDomiciliosAction");

const enColonia = {
  id: "11111111-1111-4111-8111-111111111111",
  calle: "Calle 20",
  calleId: "33333333-3333-4333-8333-333333333333",
  numero: "42-B",
  lugar: "Colonia Centro",
  lugarId: "22222222-2222-4222-8222-222222222222",
  raizId: "44444444-4444-4444-8444-444444444444",
  raiz: "Buenavista",
};
const enCabeceraSinNumero = {
  ...enColonia,
  id: "55555555-5555-4555-8555-555555555555",
  numero: null,
  lugar: "Buenavista",
  lugarId: enColonia.raizId,
};

beforeEach(() => {
  vi.clearAllMocks();
  contextoActualMock.mockResolvedValue({
    ayuntamientoId: "motul",
    usuario: { id: "usuario-1", rol: "OPERADOR" },
    origen: "web",
  });
  registroDeDomiciliosMock.mockResolvedValue({
    domicilios: [enColonia, enCabeceraSinNumero],
    hayMas: true,
  });
});

describe("buscarDomiciliosAction", () => {
  it("valida primero y no consulta para una busqueda corta", async () => {
    const resultado = await buscarDomiciliosAction({ consulta: " a " });

    expect(resultado).toMatchObject({ ok: false, codigo: "VALIDACION" });
    expect(contextoActualMock).not.toHaveBeenCalled();
    expect(registroDeDomiciliosMock).not.toHaveBeenCalled();
  });

  it("rechaza 121 caracteres antes de resolver el tenant", async () => {
    const resultado = await buscarDomiciliosAction({
      consulta: "a".repeat(121),
    });

    expect(resultado).toMatchObject({ ok: false, codigo: "VALIDACION" });
    expect(contextoActualMock).not.toHaveBeenCalled();
    expect(registroDeDomiciliosMock).not.toHaveBeenCalled();
  });

  it("busca en el registro del municipio de la sesion con un tope de 15", async () => {
    const contexto = await contextoActualMock();

    await buscarDomiciliosAction({ consulta: " Calle 20 " });

    expect(registroDeDomiciliosMock).toHaveBeenCalledWith(
      { busqueda: "Calle 20" },
      contexto,
      15,
    );
  });

  it("devuelve solo el id y la direccion escrita, con el asentamiento cuando no es el mismo lugar", async () => {
    const resultado = await buscarDomiciliosAction({ consulta: "Calle 20" });

    expect(resultado).toEqual({
      ok: true,
      data: {
        opciones: [
          {
            id: enColonia.id,
            etiqueta: "Calle 20 #42-B, Colonia Centro, Buenavista",
          },
          {
            id: enCabeceraSinNumero.id,
            etiqueta: "Calle 20 sin número, Buenavista",
          },
        ],
        hayMas: true,
      },
    });
  });

  it("rechaza una sesion ausente sin consultar domicilios", async () => {
    contextoActualMock.mockResolvedValue(null);

    const resultado = await buscarDomiciliosAction({ consulta: "Calle 20" });

    expect(resultado).toMatchObject({ ok: false, codigo: "NO_AUTORIZADO" });
    expect(registroDeDomiciliosMock).not.toHaveBeenCalled();
  });

  it("no expone el fallo de infraestructura al cliente", async () => {
    registroDeDomiciliosMock.mockRejectedValue(new Error("conexion caida"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const resultado = await buscarDomiciliosAction({ consulta: "Calle 20" });

    expect(resultado).toMatchObject({ ok: false });
    expect(JSON.stringify(resultado)).not.toContain("conexion caida");
  });
});
