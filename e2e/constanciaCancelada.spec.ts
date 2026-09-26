import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { textoDePdf } from "@/modules/constancias/textoDePdfDePrueba";
import { altaDePersona } from "@/shared/auth/alta";
import { comoAyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { accederAMotul } from "./acceder";
import { liberarVentanaDeRitmo } from "./calles.fixture";
import {
  type ConstanciasSembradas,
  sembrarConstancias,
} from "./constanciasFixture";
import { CLAVE, MUNICIPIOS, urlDe } from "./municipios";

let constancias: ConstanciasSembradas;
const correoDeOperador = `operador-constancias-${randomUUID()}@example.com`;

test.beforeAll(async () => {
  await liberarVentanaDeRitmo();

  const motul = comoAyuntamientoId(MUNICIPIOS.motul.id);

  try {
    await withTenant(motul, (tx) =>
      altaDePersona(tx, motul, {
        nombre: "Operador de Motul",
        email: correoDeOperador,
        clave: CLAVE,
        rol: "OPERADOR",
      }),
    );
  } finally {
    await cerrarConexion();
  }

  constancias = await sembrarConstancias();
});

test("sembrar constancias reserva consecutivos distintos en paralelo", async () => {
  const aleatorioOriginal = Math.random;
  Math.random = () => 0.5;

  try {
    await Promise.all([sembrarConstancias(), sembrarConstancias()]);
  } finally {
    Math.random = aleatorioOriginal;
  }
});

const pdfDe = (id: string) => urlDe("motul", `/constancias/${id}/pdf`);

test("el PDF de una constancia cancelada sigue disponible pero marcado", async ({
  page,
}) => {
  await accederAMotul(page);

  const vigente = await page.request.get(pdfDe(constancias.vigenteId));
  expect(vigente.status()).toBe(200);
  expect(textoDePdf(await vigente.body())).not.toContain("CANCELADA");

  const cancelada = await page.request.get(pdfDe(constancias.canceladaId));
  expect(cancelada.status()).toBe(200);
  expect(cancelada.headers()["content-type"]).toBe("application/pdf");
  expect(textoDePdf(await cancelada.body())).toContain("CANCELADA");
});

test("el PDF de una constancia cancelada de otro municipio da 404", async ({
  page,
}) => {
  await accederAMotul(page);

  const respuesta = await page.request.get(pdfDe(constancias.canceladaAjenaId));

  expect(respuesta.status()).toBe(404);
});

test("el detalle ofrece Imprimir solo si la constancia esta vigente", async ({
  page,
}) => {
  await accederAMotul(page);
  const imprimir = page.getByRole("link", { name: "Imprimir" });

  await page.goto(urlDe("motul", `/constancias/${constancias.vigenteId}`));
  await expect(imprimir).toHaveCount(1);

  await page.goto(urlDe("motul", `/constancias/${constancias.canceladaId}`));
  await expect(page.getByText("Documento cancelado")).toBeVisible();
  await expect(imprimir).toHaveCount(0);
});

test("un OPERADOR ve el aviso del bloque de firma en constancias", async ({
  page,
}) => {
  await accederAMotul(page, correoDeOperador);
  await page.goto(urlDe("motul", "/constancias"));

  const aviso = page.getByText(
    "Su rol no permite gestionar el bloque de firma de las constancias. Se requiere el rol de administrador municipal.",
    { exact: true },
  );

  await expect(aviso).toBeVisible();
  await expect(aviso).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Bloque de firma" })).toHaveCount(
    0,
  );
});
