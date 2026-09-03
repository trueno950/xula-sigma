import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { proxy } from "./proxy";
import {
  CABECERA_SUBDOMINIO,
  CABECERA_SUPERFICIE,
} from "./shared/tenancy/cabeceras";

/**
 * Aparte de `proxy.test.ts` porque es otro tema: alla se prueba que las
 * cabeceras de tenant sean las del proxy y no las del cliente; aca, de
 * cual de los dos hosts sale el municipio y cuando.
 *
 * Los dos ayudantes van repetidos a proposito. Exportarlos ataria los dos
 * archivos por el andamiaje, y son cinco lineas: `proxy.test.ts` explica
 * por que la cabecera se lee con el prefijo `x-middleware-request-`.
 */
function cabeceraQueRecibeElServidor(
  respuesta: Response,
  nombre: string,
): string | null {
  return respuesta.headers.get(`x-middleware-request-${nombre}`);
}

function pedir(host: string, cabecerasDelCliente: Record<string, string> = {}) {
  return proxy(
    new NextRequest(`https://${host}/constancias`, {
      headers: { host, ...cabecerasDelCliente },
    }),
  );
}

beforeEach(() => {
  process.env.DOMINIO_BASE = "xulasigma.mx";
});

afterEach(() => {
  process.env.DOMINIO_BASE = undefined;
});

/**
 * El respaldo por `x-forwarded-host`, y la reja que lo acota.
 *
 * Existe por un solo caso: el render sintetico con el que Next resuelve el
 * destino del `redirect()` de un Server Action. Ese request lo emite el
 * servidor contra si mismo, con `host` puesto al host interno -que no
 * cuelga del dominio base- y el original en `x-forwarded-host`. Sin esto,
 * el proxy responde 404 y la pantalla muere justo despues de guardar.
 */
describe("proxy — respaldo por x-forwarded-host", () => {
  it("resuelve el municipio cuando el host no cuelga del dominio base", () => {
    const res = pedir("localhost:3000", {
      "x-forwarded-host": "ticul.xulasigma.mx",
    });

    expect(cabeceraQueRecibeElServidor(res, CABECERA_SUPERFICIE)).toBe(
      "ayuntamiento",
    );
    expect(cabeceraQueRecibeElServidor(res, CABECERA_SUBDOMINIO)).toBe("ticul");
  });

  /**
   * El hallazgo que motivo mover esto al proxy.
   *
   * El dominio raiz pelado da `raiz`, no `invalido`, asi que
   * `x-forwarded-host` ni se mira. Cuando la derivacion vivia un nivel mas
   * adentro -en `tenancy/contexto.ts`, despues de que el proxy escribiera
   * `superficie: raiz` sin subdominio- esta misma peticion se servia como
   * la pantalla de Ticul. Reproducido con curl antes de sacarla.
   */
  it("una peticion a la raiz no la mueve un x-forwarded-host ajeno", () => {
    const res = pedir("xulasigma.mx", {
      "x-forwarded-host": "ticul.xulasigma.mx",
    });

    expect(cabeceraQueRecibeElServidor(res, CABECERA_SUPERFICIE)).toBe("raiz");
    expect(cabeceraQueRecibeElServidor(res, CABECERA_SUBDOMINIO)).toBeNull();
  });

  it("tampoco mueve al panel de super admin", () => {
    const res = pedir("admin.xulasigma.mx", {
      "x-forwarded-host": "ticul.xulasigma.mx",
    });

    expect(cabeceraQueRecibeElServidor(res, CABECERA_SUPERFICIE)).toBe("admin");
    expect(cabeceraQueRecibeElServidor(res, CABECERA_SUBDOMINIO)).toBeNull();
  });

  it("un municipio en el host le gana a otro en x-forwarded-host", () => {
    const res = pedir("motul.xulasigma.mx", {
      "x-forwarded-host": "ticul.xulasigma.mx",
    });

    expect(cabeceraQueRecibeElServidor(res, CABECERA_SUBDOMINIO)).toBe("motul");
  });

  it("con los dos hosts fuera del dominio base sigue siendo 404", () => {
    const res = pedir("localhost:3000", {
      "x-forwarded-host": "ticul.dominio-ajeno.mx",
    });

    expect(res.status).toBe(404);
  });

  it.each(["127.0.0.1:3000", "[::1]:3000"])(
    "el respaldo tambien corre con el host interno %s",
    (host) => {
      const res = pedir(host, { "x-forwarded-host": "ticul.xulasigma.mx" });

      expect(cabeceraQueRecibeElServidor(res, CABECERA_SUBDOMINIO)).toBe(
        "ticul",
      );
    },
  );
});

/**
 * El agujero que quedaba abierto despues de mover la resolucion al proxy.
 *
 * "El host no cuelga del dominio base" no alcanza como firma del render
 * sintetico: el hosting sirve la misma aplicacion en mas de un nombre. En
 * Railway, `<app>.up.railway.app` responde ademas del dominio propio, y
 * ese nombre tampoco cuelga de la base. Una peticion ahi caia en el
 * respaldo y elegia municipio con su propia cabecera.
 *
 * La firma real es mas angosta: el request lo emite el servidor contra si
 * mismo, asi que su `host` es el loopback. Lo demas no habilita nada.
 *
 * Si algun dia Next emitiera ese request con otro host, el redirect
 * volveria a romperse -404 despues de guardar-, no a filtrar. Ese es el
 * lado correcto para fallar, y es la regla del proyecto: ante la duda,
 * `invalido`, nunca un tenant por defecto.
 */
describe("proxy — el respaldo solo corre desde el propio servidor", () => {
  it.each([
    "xula-produccion.up.railway.app",
    "xula-produccion.up.railway.app:8080",
    "dominio-ajeno.mx",
  ])("un x-forwarded-host ajeno no elige municipio desde %s", (host) => {
    const res = pedir(host, { "x-forwarded-host": "ticul.xulasigma.mx" });

    expect(res.status).toBe(404);
    expect(cabeceraQueRecibeElServidor(res, CABECERA_SUBDOMINIO)).toBeNull();
  });
});
