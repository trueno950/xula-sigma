import type { Page, Response, Route } from "@playwright/test";
import { liberarVentanaDeRitmo } from "./calles.fixture";
import { CLAVE, CORREO, urlDe } from "./municipios";

let siguienteIpDePrueba = 0;

const ipDePruebaSiguiente = () => {
  siguienteIpDePrueba = (siguienteIpDePrueba % 254) + 1;
  return `192.0.2.${siguienteIpDePrueba}`;
};

const rutaConIpDePrueba = (ip: string) => (ruta: Route) =>
  ruta.fallback({
    headers: {
      ...ruta.request().headers(),
      "x-forwarded-for": ip,
    },
  });

async function enviarCredenciales(
  page: Page,
  correo: string,
  clave: string,
  endpoint: string,
): Promise<Response> {
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill(clave);

  const respuestaDeAcceso = page.waitForResponse(
    (respuesta) =>
      respuesta.url() === endpoint && respuesta.request().method() === "POST",
    { timeout: 20_000 },
  );
  const [, respuesta] = await Promise.all([
    page.getByRole("button", { name: "Entrar" }).click(),
    respuestaDeAcceso,
  ]);

  return respuesta;
}

async function completarAcceso(
  page: Page,
  correo: string,
  inicio: string,
  clave: string = CLAVE,
): Promise<void> {
  const endpoint = urlDe("motul", "/api/auth/sign-in/email");
  const ruta = rutaConIpDePrueba(ipDePruebaSiguiente());
  await page.route(endpoint, ruta);

  try {
    const respuesta = await enviarCredenciales(page, correo, clave, endpoint);
    if (!respuesta.ok()) {
      // El cuerpo, no solo el status: un 429 lo devuelven dos limitadores
      // distintos —el nuestro (`limitarRitmo`) y el de Better Auth— y el
      // mensaje es lo unico que dice cual fue.
      throw new Error(
        `No se pudo acceder: el servidor respondió ${respuesta.status()}: ${
          (await respuesta.text()).slice(0, 200) || "(cuerpo vacío)"
        }`,
      );
    }

    await page.waitForURL(inicio, { timeout: 5_000, waitUntil: "commit" });
  } finally {
    await page.unroute(endpoint, ruta);
  }
}

/**
 * Entra a Motul y espera al inicio.
 *
 * Better Auth 1.6.29 comparte un bucket en memoria de 3 accesos por 10s
 * para `/sign-in`, aunque construyamos la instancia por request. Cada E2E
 * usa una IP TEST-NET distinta y limpia el contador DB mediante el helper
 * existente; las credenciales y el endpoint siguen siendo reales. Tras un
 * único POST se espera su respuesta y el commit, no el evento `load` de Next.
 */
export async function accederAMotul(
  page: Page,
  correo: string = CORREO,
): Promise<void> {
  const inicio = urlDe("motul");
  await page.goto(urlDe("motul", "/acceso"));

  if (page.url() === inicio) return;

  await liberarVentanaDeRitmo();
  await completarAcceso(page, correo, inicio);
}

/**
 * Entra con una credencial concreta y espera la pantalla que sigue.
 *
 * Existe por la contrasenia temporal, que no es la `CLAVE` de los fixtures:
 * `accederAMotul` siempre usa la del administrador sembrado. `espera` es la
 * URL que se alcanza despues del POST —`null` cuando el servidor lo rechaza y
 * no hay navegacion que esperar, como en la temporal caducada—.
 */
export async function accederConClave(
  page: Page,
  datos: { correo: string; clave: string; espera: string | null },
): Promise<Response> {
  await page.goto(urlDe("motul", "/acceso"));
  await liberarVentanaDeRitmo();

  const endpoint = urlDe("motul", "/api/auth/sign-in/email");
  const ruta = rutaConIpDePrueba(ipDePruebaSiguiente());
  await page.route(endpoint, ruta);

  try {
    const respuesta = await enviarCredenciales(
      page,
      datos.correo,
      datos.clave,
      endpoint,
    );

    if (!respuesta.ok() && datos.espera) {
      throw new Error(
        `No se pudo acceder con la clave entregada: el servidor respondió ${respuesta.status()}: ${(await respuesta.text()).slice(0, 200) || "(cuerpo vacío)"}`,
      );
    }

    if (datos.espera) {
      await page.waitForURL(datos.espera, {
        timeout: 5_000,
        waitUntil: "commit",
      });
      // `commit` es cuando empieza la respuesta, no cuando termina: la pagina
      // que espera el test todavia se esta transmitiendo. Interactuar ahi es
      // una carrera —los campos ya estan y el `<input name="$ACTION_ID_…">`
      // del `<form>` de la Server Action puede no haber llegado— y el envio
      // sale sin accion: no redirige y el test se queda esperando 30 s. Lo
      // encontro la repeticion del E2E de reactivacion.
      await page.waitForLoadState("load");
    }

    return respuesta;
  } finally {
    await page.unroute(endpoint, ruta);
  }
}
