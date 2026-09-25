import { renderToBuffer } from "@react-pdf/renderer";
import { describe, expect, it } from "vitest";
import { textoDePdf } from "../../textoDePdfDePrueba";
import { ConstanciaDeVecindadV1 } from "./ConstanciaDeVecindadV1";
import type { PropsDePlantilla } from "./tipos";

const PIXEL_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const propsBase: PropsDePlantilla = {
  folio: "VEC-2026-000001",
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
  qrDataUrl: PIXEL_PNG,
  urlDeValidacion: "https://motul.xula.localhost/validar/VEC-2026-000001",
  reimpresion: false,
  cancelada: false,
};

const textoDe = async (props: Partial<PropsDePlantilla>) =>
  textoDePdf(
    await renderToBuffer(<ConstanciaDeVecindadV1 {...propsBase} {...props} />),
  );

describe("ConstanciaDeVecindadV1", () => {
  it("una constancia vigente no lleva ninguna marca", async () => {
    const texto = await textoDe({});

    expect(texto).toContain("Constancia de vecindad".toUpperCase());
    expect(texto).not.toContain("CANCELADA");
    expect(texto).not.toContain("REIMPRESIÓN");
  });

  it("una constancia cancelada lleva CANCELADA como texto extraible", async () => {
    const texto = await textoDe({ cancelada: true });

    expect(texto).toContain("CANCELADA");
    expect(texto).toContain("Juan Poot");
  });

  it("una reimpresion vigente conserva su marca propia", async () => {
    const texto = await textoDe({ reimpresion: true });

    expect(texto).toContain("REIMPRESIÓN");
    expect(texto).not.toContain("CANCELADA");
  });

  it("la marca de cancelacion desplaza a la de reimpresion", async () => {
    const texto = await textoDe({ reimpresion: true, cancelada: true });

    expect(texto).toContain("CANCELADA");
    expect(texto).not.toContain("REIMPRESIÓN");
  });
});
