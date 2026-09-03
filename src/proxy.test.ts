import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { proxy } from "./proxy";
import {
  CABECERA_SUBDOMINIO,
  CABECERA_SUPERFICIE,
} from "./shared/tenancy/cabeceras";

/**
 * El proxy no consulta la base, asi que se testea en la suite `unit`.
 *
 * Lo que se verifica no es el parseo —eso ya lo cubre `subdominio.test.ts`—
 * sino lo que el proxy le deja al resto del sistema: que las cabeceras de
 * tenant que llegan al servidor sean las que el proxy escribio y no las
 * que mando el cliente.
 */

/**
 * `NextResponse.next({ request: { headers } })` no reemplaza las cabeceras
 * en el acto: las publica como `x-middleware-request-<nombre>` y lista sus
 * nombres en `x-middleware-override-headers`. Next las aplica despues.
 * Verificado contra la version instalada.
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

beforeEach(() => {
  process.env.DOMINIO_BASE = "xulasigma.mx";
});

afterEach(() => {
  process.env.DOMINIO_BASE = undefined;
});

describe("proxy — resolucion de tenant", () => {
  it("publica el subdominio del municipio", async () => {
    const res = await pedir("ticul.xulasigma.mx");

    expect(cabeceraQueRecibeElServidor(res, CABECERA_SUPERFICIE)).toBe(
      "ayuntamiento",
    );
    expect(cabeceraQueRecibeElServidor(res, CABECERA_SUBDOMINIO)).toBe("ticul");
  });

  it("marca el panel de super admin sin subdominio de municipio", async () => {
    const res = await pedir("admin.xulasigma.mx");

    expect(cabeceraQueRecibeElServidor(res, CABECERA_SUPERFICIE)).toBe("admin");
    expect(cabeceraQueRecibeElServidor(res, CABECERA_SUBDOMINIO)).toBeNull();
  });

  it("marca la raiz", async () => {
    const res = await pedir("xulasigma.mx");

    expect(cabeceraQueRecibeElServidor(res, CABECERA_SUPERFICIE)).toBe("raiz");
    expect(cabeceraQueRecibeElServidor(res, CABECERA_SUBDOMINIO)).toBeNull();
  });

  it("responde 404 a un host que no es nuestro", async () => {
    expect((await pedir("ticul.otrodominio.mx")).status).toBe(404);
  });
});

describe("proxy — cabeceras falsificadas por el cliente", () => {
  /**
   * Estos son los tests que importan.
   *
   * Las cabeceras entrantes las controla quien hace la peticion. Si una
   * `x-xula-subdominio` puesta a mano sobreviviera, un usuario de Motul
   * elegiria contra que municipio corre su request — la fuga exacta que
   * RLS existe para impedir, entrando por la puerta de adelante.
   */

  /**
   * Los dos primeros son mas debiles de lo que parecen y conviene decirlo:
   * en las ramas donde el proxy SIEMPRE escribe la cabecera, el `set` pisa
   * el valor inyectado aunque no hubiera `delete`. Quedan porque describen
   * el contrato, no porque detecten la regresion.
   *
   * Los que si detectan la falla son los de `admin` y `raiz`: ahi el proxy
   * no escribe `x-xula-subdominio`, y sin el `delete` el valor del cliente
   * sobrevive intacto hasta el servidor. Verificado quitando los `delete`:
   * esos dos caen, los otros no.
   */

  it("descarta un subdominio inyectado por el cliente", async () => {
    const res = await pedir("ticul.xulasigma.mx", {
      [CABECERA_SUBDOMINIO]: "motul",
    });

    expect(cabeceraQueRecibeElServidor(res, CABECERA_SUBDOMINIO)).toBe("ticul");
  });

  it("descarta una superficie inyectada por el cliente", async () => {
    // Sin esto, cualquiera se declararia `admin` desde el subdominio de su
    // propio municipio.
    const res = await pedir("ticul.xulasigma.mx", {
      [CABECERA_SUPERFICIE]: "admin",
    });

    expect(cabeceraQueRecibeElServidor(res, CABECERA_SUPERFICIE)).toBe(
      "ayuntamiento",
    );
  });

  it("no deja pasar un subdominio inyectado desde el panel de admin", async () => {
    // `admin` no pertenece a ningun municipio. Si el cliente adjunta uno,
    // no tiene que quedar nada.
    const res = await pedir("admin.xulasigma.mx", {
      [CABECERA_SUBDOMINIO]: "ticul",
    });

    expect(cabeceraQueRecibeElServidor(res, CABECERA_SUBDOMINIO)).toBeNull();
  });

  it("no deja pasar un subdominio inyectado desde la raiz", async () => {
    const res = await pedir("xulasigma.mx", {
      [CABECERA_SUBDOMINIO]: "ticul",
    });

    expect(cabeceraQueRecibeElServidor(res, CABECERA_SUBDOMINIO)).toBeNull();
  });

  it("no deja pasar nada desde un host invalido", async () => {
    const res = await pedir("ticul.otrodominio.mx", {
      [CABECERA_SUBDOMINIO]: "motul",
      [CABECERA_SUPERFICIE]: "ayuntamiento",
    });

    expect(res.status).toBe(404);
    expect(cabeceraQueRecibeElServidor(res, CABECERA_SUBDOMINIO)).toBeNull();
    expect(cabeceraQueRecibeElServidor(res, CABECERA_SUPERFICIE)).toBeNull();
  });
});
