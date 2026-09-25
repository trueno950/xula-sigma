import { expect, test } from "@playwright/test";
import { textoDePdf } from "@/modules/constancias/textoDePdfDePrueba";
import { accederAMotul } from "./acceder";
import { liberarVentanaDeRitmo } from "./calles.fixture";
import {
  type ConstanciasSembradas,
  sembrarConstancias,
} from "./constanciasFixture";
import { urlDe } from "./municipios";

let constancias: ConstanciasSembradas;

test.beforeAll(async () => {
  await liberarVentanaDeRitmo();
  constancias = await sembrarConstancias();
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
