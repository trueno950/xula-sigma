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
  endpoint: string,
): Promise<Response> {
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill(CLAVE);

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
): Promise<void> {
  const endpoint = urlDe("motul", "/api/auth/sign-in/email");
  const ruta = rutaConIpDePrueba(ipDePruebaSiguiente());
  await page.route(endpoint, ruta);

  try {
    const respuesta = await enviarCredenciales(page, correo, endpoint);
    if (!respuesta.ok()) {
      throw new Error(
        `No se pudo acceder: el servidor respondió ${respuesta.status()}.`,
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
