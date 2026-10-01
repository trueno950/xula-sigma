import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("./actions/cancelarConstanciaAction", () => ({
  cancelarConstanciaAction: "cancelar-action",
}));
vi.mock("./actions/reimprimirConstanciaAction", () => ({
  reimprimirConstanciaAction: "reimprimir-action",
}));

const { BotonDeCancelacion } = await import("./BotonDeCancelacion");
const { BotonDeReimpresion } = await import("./BotonDeReimpresion");
const { FiltrosDeConstancias } = await import("./FiltrosDeConstancias");

describe("motivos y estados de constancias en pantalla", () => {
  it("el motivo de cancelacion se ofrece con etiqueta y el codigo como valor", () => {
    const html = renderToStaticMarkup(<BotonDeCancelacion constanciaId="c1" />);

    expect(html).toContain(
      '<option value="ERROR_DE_CAPTURA">Error de captura</option>',
    );
    expect(html).toContain(
      '<option value="SOLICITUD_DEL_INTERESADO">Solicitud del interesado</option>',
    );
  });

  it("el motivo de reimpresion se ofrece con etiqueta y el codigo como valor", () => {
    const html = renderToStaticMarkup(<BotonDeReimpresion constanciaId="c1" />);

    expect(html).toContain('<option value="EXTRAVIO">Extravío</option>');
    expect(html).toContain(
      '<option value="EJEMPLAR_ADICIONAL">Ejemplar adicional</option>',
    );
  });

  it("el filtro de estado se ofrece con etiqueta y el codigo como valor", () => {
    const html = renderToStaticMarkup(<FiltrosDeConstancias />);

    expect(html).toContain('<option value="VIGENTE">Vigente</option>');
    expect(html).toContain('<option value="CANCELADA">Cancelada</option>');
  });
});
