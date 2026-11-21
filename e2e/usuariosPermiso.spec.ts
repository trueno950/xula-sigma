import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { altaDePersona } from "@/shared/auth/alta";
import { comoAyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import { withTenant } from "@/shared/tenancy/withTenant";
import { accederAMotul } from "./acceder";
import { liberarVentanaDeRitmo } from "./calles.fixture";
import { CLAVE, MUNICIPIOS, urlDe } from "./municipios";

/**
 * S15 de `usuarios-ux` (hallazgo P1) en el navegador: quien no administra
 * cuentas no ve una caja suelta sin encabezado ni salida, sino la misma
 * pantalla del módulo con el cuerpo cambiado
 * (`design/usuarios-clave-temporal/01-aviso-sobre-la-lista.html`, muestra de
 * la pantalla sin permiso).
 *
 * Las dos rutas se prueban con una cuenta `OPERADOR` sembrada en la base y no
 * por el alta del panel: lo que se prueba es la pantalla sin permiso, y darla
 * de alta por la UI costaría más que todo el resto del test junto.
 */

const MOTUL = comoAyuntamientoId(MUNICIPIOS.motul.id);

const ROL_SIN_PERMISO = "Su rol es Operador: no administra cuentas.";

/** Un acceso por test y la ventana de ritmo por correo es de cinco intentos. */
test.beforeEach(liberarVentanaDeRitmo);

const sembrarOperador = async (): Promise<string> => {
  const correo = `sin-permiso-${randomUUID()}@example.com`;

  await withTenant(MOTUL, (tx) =>
    altaDePersona(tx, MOTUL, {
      nombre: `Operadora Sin Permiso ${correo.slice(0, 18)}`,
      email: correo,
      clave: CLAVE,
      rol: "OPERADOR",
    }),
  );

  return correo;
};

test("el listado sin permiso conserva el encabezado y no pinta el listado", async ({
  page,
}) => {
  await accederAMotul(page, await sembrarOperador());

  await page.goto(urlDe("motul", "/usuarios"));

  await expect(
    page.getByRole("heading", { level: 1, name: "Usuarios" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Quién entra a este panel y con qué rol. Las cuentas son de este ayuntamiento.",
    ),
  ).toBeVisible();
  await expect(page.getByText(ROL_SIN_PERMISO)).toBeVisible();
  await expect(
    page.getByText(/Pida al administrador municipal que cambie su rol/),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Volver al padrón" }),
  ).toBeVisible();

  // No se ofrece lo que el rol no puede hacer ni se lee el listado.
  await expect(page.getByRole("link", { name: "Nuevo usuario" })).toHaveCount(
    0,
  );
  await expect(page.getByText(/cuentas activas/)).toHaveCount(0);
});

test("el alta sin permiso conserva el encabezado y la migaja del panel", async ({
  page,
}) => {
  await accederAMotul(page, await sembrarOperador());

  await page.goto(urlDe("motul", "/usuarios/alta"));

  await expect(
    page.getByRole("heading", { level: 1, name: "Nuevo usuario" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Ruta" })
      .getByRole("link", { name: "Usuarios" }),
  ).toBeVisible();
  await expect(page.getByText(ROL_SIN_PERMISO)).toBeVisible();
  await expect(page.getByLabel("Nombre completo")).toHaveCount(0);
});
