import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { proxy } from "./proxy";
import {
  CABECERA_SUBDOMINIO,
  CABECERA_SUPERFICIE,
} from "./shared/tenancy/cabeceras";
import {
  firmarRespaldoDeHost,
  NOMBRE_COOKIE_RESPALDO,
} from "./shared/tenancy/respaldoDeHost";

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

async function pedir(
  host: string,
  cabecerasDelCliente: Record<string, string> = {},
) {
  return proxy(
    new NextRequest(`https://${host}/constancias`, {
      headers: { host, ...cabecerasDelCliente },
    }),
  );
}

const SECRETO_DE_PRUEBA = "secreto-de-prueba-no-usar-en-produccion";

/** Una cookie de respaldo firmada de verdad, para simular al servidor. */
const conRespaldoDe = async (subdominio: string) => ({
  cookie: `${NOMBRE_COOKIE_RESPALDO}=${await firmarRespaldoDeHost(subdominio, SECRETO_DE_PRUEBA)}`,
});

beforeEach(() => {
  process.env.DOMINIO_BASE = "xulasigma.mx";
});

afterEach(() => {
  process.env.DOMINIO_BASE = undefined;
});

/**
 * El respaldo por cookie firmada, y la reja que lo acota.
 *
 * Existe por un solo caso: el render sintetico con el que Next resuelve el
 * destino del `redirect()` de un Server Action. Ese request lo emite el
 * servidor contra si mismo, con `host` puesto al host interno -que no
 * cuelga del dominio base-. Sin esto, el proxy responde 404 y la pantalla
 * muere justo despues de guardar.
 *
 * La cookie, no `x-forwarded-host`: la version anterior confiaba en esa
 * cabecera con solo `esHostInterno(host)` de condicion, y las dos las
 * escribe quien hace la peticion. `resolverHost` esta documentado con el
 * detalle completo; aca se mide el comportamiento.
 */
describe("proxy — respaldo por cookie firmada", () => {
  it("resuelve el municipio cuando el host no cuelga del dominio base", async () => {
    const res = await pedir("localhost:3000", await conRespaldoDe("ticul"));

    expect(cabeceraQueRecibeElServidor(res, CABECERA_SUPERFICIE)).toBe(
      "ayuntamiento",
    );
    expect(cabeceraQueRecibeElServidor(res, CABECERA_SUBDOMINIO)).toBe("ticul");
  });

  /**
   * El hallazgo que motivo mover esto al proxy.
   *
   * El dominio raiz pelado da `raiz`, no `invalido`, asi que el respaldo
   * ni se prueba. Cuando la derivacion vivia un nivel mas adentro -en
   * `tenancy/contexto.ts`, despues de que el proxy escribiera
   * `superficie: raiz` sin subdominio- esta misma peticion se servia como
   * la pantalla de Ticul. Reproducido con curl antes de sacarla.
   */
  it("una peticion a la raiz no la mueve una cookie de otro municipio", async () => {
    const res = await pedir("xulasigma.mx", await conRespaldoDe("ticul"));

    expect(cabeceraQueRecibeElServidor(res, CABECERA_SUPERFICIE)).toBe("raiz");
    expect(cabeceraQueRecibeElServidor(res, CABECERA_SUBDOMINIO)).toBeNull();
  });

  it("tampoco mueve al panel de super admin", async () => {
    const res = await pedir("admin.xulasigma.mx", await conRespaldoDe("ticul"));

    expect(cabeceraQueRecibeElServidor(res, CABECERA_SUPERFICIE)).toBe("admin");
    expect(cabeceraQueRecibeElServidor(res, CABECERA_SUBDOMINIO)).toBeNull();
  });

  it("un municipio en el host le gana a otro en la cookie", async () => {
    const res = await pedir("motul.xulasigma.mx", await conRespaldoDe("ticul"));

    expect(cabeceraQueRecibeElServidor(res, CABECERA_SUBDOMINIO)).toBe("motul");
  });

  it.each(["127.0.0.1:3000", "[::1]:3000"])(
    "el respaldo tambien corre con el host interno %s",
    async (host) => {
      const res = await pedir(host, await conRespaldoDe("ticul"));

      expect(cabeceraQueRecibeElServidor(res, CABECERA_SUBDOMINIO)).toBe(
        "ticul",
      );
    },
  );

  it("sin cookie de respaldo, el host interno sigue siendo 404", async () => {
    const res = await pedir("localhost:3000");

    expect(res.status).toBe(404);
  });
});

/**
 * El hallazgo que este mecanismo cierra: `x-forwarded-host` y `Host` los
 * escribe quien hace la peticion, asi que un curl con los dos armaba el
 * mismo request que el render sintetico sin haber pasado nunca por el
 * servidor. La cookie la firma el servidor con `BETTER_AUTH_SECRET`: sin
 * el secreto no hay forma de producir un valor que verifique.
 */
describe("proxy — una cookie sin firmar por el servidor no elige tenant", () => {
  it("un valor inventado, sin secreto, no verifica: 404", async () => {
    const res = await pedir("localhost:3000", {
      cookie: `${NOMBRE_COOKIE_RESPALDO}=ticul.deadbeefdeadbeefdeadbeefdeadbeef`,
    });

    expect(res.status).toBe(404);
    expect(cabeceraQueRecibeElServidor(res, CABECERA_SUBDOMINIO)).toBeNull();
  });

  it("una cookie firmada para otro municipio no vale para el que se pide", async () => {
    const firmada = await firmarRespaldoDeHost("motul", SECRETO_DE_PRUEBA);
    const firma = firmada.slice(firmada.lastIndexOf("."));
    const falsificada = `ticul${firma}`;

    const res = await pedir("localhost:3000", {
      cookie: `${NOMBRE_COOKIE_RESPALDO}=${falsificada}`,
    });

    expect(res.status).toBe(404);
  });

  it("x-forwarded-host solo, sin la cookie, ya no mueve nada", async () => {
    const res = await pedir("localhost:3000", {
      "x-forwarded-host": "ticul.xulasigma.mx",
    });

    expect(res.status).toBe(404);
    expect(cabeceraQueRecibeElServidor(res, CABECERA_SUBDOMINIO)).toBeNull();
  });
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
 * mismo, asi que su `host` es el loopback. Lo demas no habilita nada, ni
 * siquiera con una cookie firmada de verdad: `esHostInterno` se evalua
 * antes de mirar la cookie.
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
  ])(
    "una cookie de respaldo valida no elige municipio desde %s",
    async (host) => {
      const res = await pedir(host, await conRespaldoDe("ticul"));

      expect(res.status).toBe(404);
      expect(cabeceraQueRecibeElServidor(res, CABECERA_SUBDOMINIO)).toBeNull();
    },
  );
});
