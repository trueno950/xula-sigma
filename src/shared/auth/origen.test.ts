import { describe, expect, it } from "vitest";
import { origenDesde } from "./origen";

const cabeceras = (valores: Record<string, string>) => new Headers(valores);

describe("origenDesde", () => {
  it("usa el Host de la peticion y no el respaldo", () => {
    expect(
      origenDesde(cabeceras({ host: "motul.localhost:3000" }), "http://otro"),
    ).toBe("http://motul.localhost:3000");
  });

  it("respeta el protocolo que pone el proxy", () => {
    expect(
      origenDesde(
        cabeceras({
          host: "motul.xulasigma.mx",
          "x-forwarded-proto": "https",
        }),
        "http://localhost:3000",
      ),
    ).toBe("https://motul.xulasigma.mx");
  });

  /**
   * El caso que dejaba viva la falla original.
   *
   * Sin `x-forwarded-proto` —un proxy que no lo manda, o HTTPS directo— la
   * puerta del handler sacaba el protocolo de `request.url` y la de la
   * sesion devolvia `"http"` fijo. Con la peticion en `https`, una decia
   * `https://host` y la otra `http://host`: dos `baseURL` distintas para la
   * misma libreria, que es el defecto que produjo `Invalid origin`.
   */
  it("sin x-forwarded-proto saca el protocolo del respaldo, no un http fijo", () => {
    expect(
      origenDesde(
        cabeceras({ host: "motul.xulasigma.mx" }),
        "https://motul.xulasigma.mx",
      ),
    ).toBe("https://motul.xulasigma.mx");
  });

  it("sin Host devuelve el respaldo entero", () => {
    expect(origenDesde(cabeceras({}), "https://xulasigma.mx")).toBe(
      "https://xulasigma.mx",
    );
  });
});
