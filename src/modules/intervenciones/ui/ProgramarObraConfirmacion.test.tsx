import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ObraDeReporte } from "../application/obrasDeReporte";
import { comoIntervencionId } from "../domain";
import { ProgramarObraConfirmacion } from "./ProgramarObraConfirmacion";

const OBRA: ObraDeReporte = {
  id: comoIntervencionId("33333333-3333-4333-8333-333333333333"),
  tipo: "BACHE",
  estado: "PLANIFICADA",
  fechaDeOcurrencia: "2026-11-20",
};

describe("ProgramarObraConfirmacion", () => {
  /**
   * S16 (P1): tras programar, la pantalla confirma con un aviso y un enlace
   * «Ver la obra». La `obra` ya la cruzo la pagina contra las que leyo bajo
   * RLS: este componente no acepta un id suelto de la URL.
   */
  it("confirma el alta y enlaza la obra creada", () => {
    const html = renderToStaticMarkup(
      <ProgramarObraConfirmacion obra={OBRA} />,
    );

    expect(html).toContain("La obra quedó programada.");
    expect(html).toContain(`href="/intervenciones/${OBRA.id}"`);
    expect(html).toContain("Ver la obra");
    expect(html).toContain("text-senial-exito");
  });
});
