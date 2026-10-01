import type { Page } from "@playwright/test";
import { CLAVE, CORREO, urlDe } from "./municipios";

/**
 * Entra a Motul y espera al inicio.
 *
 * Reintenta porque `pnpm start` suma el limitador en memoria de Better Auth
 * (tres accesos por ventana de diez segundos), que ninguna base vacia: los
 * specs anteriores de la corrida ya accedieron con este mismo correo. Es
 * el mismo bucle que `bajaDeLugar.spec.ts` y `mapa-operativo.spec.ts`.
 */
export async function accederAMotul(
  page: Page,
  correo: string = CORREO,
): Promise<void> {
  for (let intento = 0; intento < 5; intento++) {
    await page.goto(urlDe("motul", "/acceso"));

    if (page.url() === urlDe("motul")) return;

    await page.getByLabel("Correo").fill(correo);
    await page.getByLabel("Contraseña").fill(CLAVE);
    await page.getByRole("button", { name: "Entrar" }).click();

    try {
      await page.waitForURL(urlDe("motul"), { timeout: 5_000 });
      return;
    } catch (error) {
      if (!(error instanceof Error) || error.name !== "TimeoutError")
        throw error;

      // El clic puede haber dejado el sign-in en vuelo (hidratacion lenta
      // sobre un servidor cargado): esperar el redirect y no dormir a
      // ciegas, porque re-navegar a /acceso encima de una sesion que ya
      // existe cuenta como navegacion de mas para quien mide el helper.
      await page
        .waitForURL(urlDe("motul"), { timeout: 20_000 })
        .catch(() => {});

      if (page.url() === urlDe("motul")) return;
    }
  }

  throw new Error("No se pudo acceder: la ventana de ritmo no se libero.");
}
