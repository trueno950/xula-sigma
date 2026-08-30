import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EntradaDeRender } from "../application/puertosDeRender";
import { PlantillaDesconocidaError } from "../domain";

/**
 * `renderToBuffer` mockeado, pero `Document`/`Page`/`View`/`Text`/`Image`
 * reales -via `importOriginal`-: el JSX de `ConstanciaDeVecindadV1.tsx` se
 * construye de verdad (`React.createElement` no ejecuta el renderer), y lo
 * unico que se evita es generar bytes de PDF en cada test.
 */
const renderToBufferMock = vi.hoisted(() => vi.fn());
const toDataURLMock = vi.hoisted(() => vi.fn());

vi.mock("@react-pdf/renderer", async (importOriginal) => {
  const real = await importOriginal<typeof import("@react-pdf/renderer")>();
  return { ...real, renderToBuffer: renderToBufferMock };
});

vi.mock("qrcode", () => ({ toDataURL: toDataURLMock }));

const { renderizadorReactPdf } = await import("./renderizadorReactPdf");

const entradaBase: EntradaDeRender = {
  folio: "VEC-2026-000001",
  tipo: "VECINDAD",
  plantillaVersion: "vecindad-v1",
  datos: {
    titular: { nombreCompleto: "Juan Poot" },
    direccion: {
      texto: "Calle 20 #10",
      residenciaId: "residencia-1",
      desdeEn: "2024-01-01",
    },
    firmante: { nombre: "Maria Poot", cargo: "Secretaria Municipal" },
  },
  municipio: { nombre: "Motul" },
  urlDeValidacion: "https://motul.localhost/validar/VEC-2026-000001?c=abc123",
  reimpresion: false,
};

describe("renderizadorReactPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toDataURLMock.mockResolvedValue("data:image/png;base64,qr");
    renderToBufferMock.mockResolvedValue(Buffer.from([1, 2, 3]));
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("plantillaVersion desconocida -> PlantillaDesconocidaError, antes de intentar renderizar nada", async () => {
    await expect(
      renderizadorReactPdf.aPdf({
        ...entradaBase,
        plantillaVersion: "no-existe",
      }),
    ).rejects.toBeInstanceOf(PlantillaDesconocidaError);

    expect(toDataURLMock).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(renderToBufferMock).not.toHaveBeenCalled();
  });

  it("qrcode.toDataURL recibe la URL de validacion, ya compuesta por pdfDeConstancia", async () => {
    await renderizadorReactPdf.aPdf(entradaBase);

    expect(toDataURLMock).toHaveBeenCalledWith(entradaBase.urlDeValidacion);
  });

  it("escudo undefined -> renderiza sin la imagen, no lanza y no descarga nada", async () => {
    await expect(
      renderizadorReactPdf.aPdf(entradaBase),
    ).resolves.toBeInstanceOf(Uint8Array);

    expect(fetch).not.toHaveBeenCalled();
    expect(renderToBufferMock).toHaveBeenCalledTimes(1);

    const elemento = renderToBufferMock.mock.calls[0]?.[0] as {
      props: { municipio: { escudo?: Buffer } };
    };
    expect(elemento.props.municipio.escudo).toBeUndefined();
  });

  it("la descarga del escudo que falla no lanza: renderiza sin escudo", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network"));
    const entrada: EntradaDeRender = {
      ...entradaBase,
      municipio: {
        nombre: "Motul",
        escudo: "https://assets.example.com/escudo.png",
      },
    };

    await expect(renderizadorReactPdf.aPdf(entrada)).resolves.toBeInstanceOf(
      Uint8Array,
    );

    const elemento = renderToBufferMock.mock.calls[0]?.[0] as {
      props: { municipio: { escudo?: Buffer } };
    };
    expect(elemento.props.municipio.escudo).toBeUndefined();
  });

  it("el escudo descargado llega a la plantilla como Buffer", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([9, 9, 9]).buffer,
    } as Response);
    const entrada: EntradaDeRender = {
      ...entradaBase,
      municipio: {
        nombre: "Motul",
        escudo: "https://assets.example.com/escudo.png",
      },
    };

    await renderizadorReactPdf.aPdf(entrada);

    expect(fetch).toHaveBeenCalledWith(
      "https://assets.example.com/escudo.png",
      expect.anything(),
    );
    const elemento = renderToBufferMock.mock.calls[0]?.[0] as {
      props: { municipio: { escudo?: Buffer } };
    };
    expect(Buffer.isBuffer(elemento.props.municipio.escudo)).toBe(true);
    expect([...(elemento.props.municipio.escudo ?? [])]).toEqual([9, 9, 9]);
  });
});
