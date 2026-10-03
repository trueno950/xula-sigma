import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { estadoDeLista } from "@/shared/ui";
import type { ConstanciaGuardada } from "../application/puertos";
import { ListadoDeConstancias } from "./ListadoDeConstancias";

const constancia = (parcial: Partial<ConstanciaGuardada>): ConstanciaGuardada =>
  ({
    id: "11111111-1111-4111-8111-111111111111",
    folio: "CON-2026-000001",
    emitidaEn: new Date("2026-03-01T18:00:00Z"),
    canceladaEn: null,
    ...parcial,
  }) as ConstanciaGuardada;

const html = (constancias: readonly ConstanciaGuardada[]) =>
  renderToStaticMarkup(
    <ListadoDeConstancias
      constancias={constancias}
      hayMas={false}
      estadoDeLista={estadoDeLista({ total: constancias.length })}
      filtros={{}}
    />,
  );

describe("ListadoDeConstancias", () => {
  it("una constancia vigente lleva insignia de exito con icono y palabra", () => {
    expect(html([constancia({})])).toMatch(
      /bg-senial-exito-suave[^>]*><svg[^>]*>.*<\/svg>Vigente</,
    );
  });

  it("una constancia cancelada lleva insignia de error con icono y palabra", () => {
    expect(
      html([constancia({ canceladaEn: new Date("2026-03-02T18:00:00Z") })]),
    ).toMatch(/bg-senial-error-suave[^>]*><svg[^>]*>.*<\/svg>Cancelada</);
  });
});
