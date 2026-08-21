import { describe, expect, it } from "vitest";
import { claveTenantDesdeUrl } from "./claveDesdeUrl";

/**
 * `claveTenantDesdeUrl` es la unica regla que decide si un DELETE procede.
 * Dos barreras, las dos de seguridad: el origen de la URL tiene que
 * coincidir exactamente con el dominio publico configurado (nunca
 * `startsWith` sobre el string completo), y la clave resultante tiene que
 * empezar con el `ayuntamientoId` de quien pide el borrado.
 */

const BASE = "https://assets.xulasigma.mx";

describe("claveTenantDesdeUrl", () => {
  it("devuelve la clave cuando la URL es del propio ayuntamiento", () => {
    expect(
      claveTenantDesdeUrl(BASE, "motul", `${BASE}/motul/escudo-x.png`),
    ).toBe("motul/escudo-x.png");
  });

  it("devuelve null si la clave es de otro ayuntamiento en el mismo host", () => {
    expect(
      claveTenantDesdeUrl(BASE, "motul", `${BASE}/ticul/escudo-x.png`),
    ).toBeNull();
  });

  it("devuelve null ante un host que solo comparte el prefijo de texto", () => {
    // https://assets.xulasigma.mx.evil.com empieza igual que BASE como
    // string, pero es un origen distinto.
    expect(
      claveTenantDesdeUrl(
        BASE,
        "motul",
        "https://assets.xulasigma.mx.evil.com/motul/escudo-x.png",
      ),
    ).toBeNull();
  });

  it("devuelve null ante un host de todo distinto", () => {
    expect(
      claveTenantDesdeUrl(
        BASE,
        "motul",
        "https://otro-dominio.example/motul/escudo-x.png",
      ),
    ).toBeNull();
  });

  it("devuelve null ante una URL que no se puede parsear", () => {
    expect(claveTenantDesdeUrl(BASE, "motul", "no-es-una-url")).toBeNull();
  });

  it("respeta un dominio publico con ruta propia", () => {
    const baseConRuta = "https://cdn.example.com/marca-bucket";

    expect(
      claveTenantDesdeUrl(
        baseConRuta,
        "motul",
        `${baseConRuta}/motul/escudo-x.png`,
      ),
    ).toBe("motul/escudo-x.png");
  });

  it("no confunde un prefijo de tenant que es substring de otro", () => {
    // "motul2" no es "motul": el chequeo tiene que ser por el segmento
    // completo (`motul/`) y no por `startsWith("motul")`.
    expect(
      claveTenantDesdeUrl(BASE, "motul", `${BASE}/motul2/escudo-x.png`),
    ).toBeNull();
  });
});
