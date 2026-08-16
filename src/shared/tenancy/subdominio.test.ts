import { describe, expect, it } from "vitest";
import { leerSubdominio } from "./subdominio";

/**
 * Lectura del subdominio a partir del Host. Es logica pura: no toca base
 * de datos ni red, y por eso corre en la suite `unit`.
 *
 * De lo que salga de aca depende contra que municipio se resuelve todo el
 * request. Un `null` mal devuelto no es un bug de parseo: es un request
 * que termina en el tenant equivocado.
 */

const BASE = "xulasigma.mx";

describe("leerSubdominio", () => {
  it("extrae el subdominio de un municipio", () => {
    expect(leerSubdominio("ticul.xulasigma.mx", BASE)).toEqual({
      tipo: "ayuntamiento",
      subdominio: "ticul",
    });
  });

  it("ignora el puerto", () => {
    expect(leerSubdominio("motul.xulasigma.mx:3000", BASE)).toEqual({
      tipo: "ayuntamiento",
      subdominio: "motul",
    });
  });

  it("normaliza a minusculas", () => {
    // El Host llega como lo mande el cliente. `TICUL` y `ticul` son el
    // mismo municipio; si no se normaliza, la busqueda en base falla y el
    // usuario ve un 404 sin entender por que.
    expect(leerSubdominio("TICUL.XulaSigma.mx", BASE)).toEqual({
      tipo: "ayuntamiento",
      subdominio: "ticul",
    });
  });

  it("reconoce el panel de super admin", () => {
    // `admin` vive fuera del espacio de tenants: tiene su propia tabla y
    // no es un municipio. Ver ADR 0001 seccion 1.
    expect(leerSubdominio("admin.xulasigma.mx", BASE)).toEqual({
      tipo: "admin",
    });
  });

  it("reconoce el dominio raiz", () => {
    expect(leerSubdominio("xulasigma.mx", BASE)).toEqual({ tipo: "raiz" });
  });

  it("trata www como raiz, no como municipio", () => {
    // Sin esto, `www` seria un subdominio valido y alguien podria dar de
    // alta un municipio llamado `www` que secuestraria el sitio publico.
    expect(leerSubdominio("www.xulasigma.mx", BASE)).toEqual({ tipo: "raiz" });
  });

  it("funciona en desarrollo con localhost", () => {
    expect(leerSubdominio("ticul.localhost:3000", "localhost")).toEqual({
      tipo: "ayuntamiento",
      subdominio: "ticul",
    });
  });

  describe("rechaza", () => {
    it("un Host ausente", () => {
      expect(leerSubdominio(null, BASE)).toEqual({ tipo: "invalido" });
    });

    it("un dominio que no es el nuestro", () => {
      // Un Host apuntando a otro dominio no se interpreta jamas: seria
      // aceptar que un tercero elija el tenant.
      expect(leerSubdominio("ticul.otrodominio.mx", BASE)).toEqual({
        tipo: "invalido",
      });
    });

    it("un dominio que solo termina parecido", () => {
      // `noxulasigma.mx` termina en `xulasigma.mx` como cadena. Si la
      // comparacion fuera un `endsWith` pelado, esto pasaria.
      expect(leerSubdominio("ticul.noxulasigma.mx", BASE)).toEqual({
        tipo: "invalido",
      });
    });

    it("subdominios anidados", () => {
      expect(leerSubdominio("a.ticul.xulasigma.mx", BASE)).toEqual({
        tipo: "invalido",
      });
    });

    it("caracteres que no son de un subdominio", () => {
      for (const host of [
        "ti_cul.xulasigma.mx",
        "ticul..xulasigma.mx",
        "-ticul.xulasigma.mx",
        "ticul-.xulasigma.mx",
        "ti cul.xulasigma.mx",
        "ticul'.xulasigma.mx",
      ]) {
        expect(leerSubdominio(host, BASE), host).toEqual({ tipo: "invalido" });
      }
    });

    it("un subdominio de un solo caracter o mas largo que una etiqueta DNS", () => {
      expect(leerSubdominio("t.xulasigma.mx", BASE)).toEqual({
        tipo: "invalido",
      });
      expect(leerSubdominio(`${"t".repeat(64)}.xulasigma.mx`, BASE)).toEqual({
        tipo: "invalido",
      });
    });

    it("los nombres reservados", () => {
      for (const reservado of ["api", "static", "assets", "mail", "ftp"]) {
        expect(
          leerSubdominio(`${reservado}.xulasigma.mx`, BASE),
          reservado,
        ).toEqual({ tipo: "invalido" });
      }
    });
  });
});
