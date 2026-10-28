import { type Browser, expect, type Page, test } from "@playwright/test";
import { accederAMotul } from "./acceder";
import { urlDe } from "./municipios";

const endpointDeAcceso = urlDe("motul", "/api/auth/sign-in/email");
const paginaDeAcceso = urlDe("motul", "/acceso");

type ResultadoDeLlenadoFallido = {
  error: unknown;
  publicaciones: number;
};

const esperarTurnoDeNode = () =>
  new Promise<void>((resolver) => setImmediate(resolver));

function contarPublicacionesDeAcceso(page: Page): () => number {
  let publicaciones = 0;
  page.on("request", (solicitud) => {
    if (solicitud.url() === endpointDeAcceso && solicitud.method() === "POST") {
      publicaciones += 1;
    }
  });
  return () => publicaciones;
}

async function servirAccesoSinCampos(page: Page): Promise<void> {
  await page.route(paginaDeAcceso, (ruta) =>
    ruta.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><html><body>Formulario ausente</body></html>",
    }),
  );
}

async function reproducirLlenadoFallido(
  browser: Browser,
): Promise<ResultadoDeLlenadoFallido> {
  const contexto = await browser.newContext();
  try {
    const page = await contexto.newPage();
    page.setDefaultTimeout(150);
    const publicaciones = contarPublicacionesDeAcceso(page);
    await servirAccesoSinCampos(page);

    const error = await accederAMotul(page).then(
      () => null,
      (fallo: unknown) => fallo,
    );
    return { error, publicaciones: publicaciones() };
  } finally {
    await contexto.close();
    await esperarTurnoDeNode();
  }
}

test("un llenado fallido conserva el error y no deja un waiter huérfano", async ({
  browser,
}) => {
  const rechazosNoManejados: unknown[] = [];
  const registrarRechazo = (rechazo: unknown) =>
    rechazosNoManejados.push(rechazo);
  process.on("unhandledRejection", registrarRechazo);

  try {
    const resultado = await reproducirLlenadoFallido(browser);
    expect(resultado.error).toBeInstanceOf(Error);
    if (!(resultado.error instanceof Error)) {
      throw new Error("El error original de llenado no se conservó.");
    }
    expect(resultado.error.name).toBe("TimeoutError");
    expect(resultado.error.message).toContain("locator.fill");
    expect(resultado.publicaciones).toBe(0);
    expect(rechazosNoManejados).toEqual([]);
  } finally {
    process.off("unhandledRejection", registrarRechazo);
  }
});
