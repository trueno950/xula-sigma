import { describe, expect, it } from "vitest";
import {
  firmarRespaldoDeHost,
  verificarRespaldoDeHost,
} from "./respaldoDeHost";

const SECRETO = "secreto-de-prueba-no-real";

describe("firmarRespaldoDeHost / verificarRespaldoDeHost", () => {
  it("lo que firma con un secreto, lo verifica el mismo secreto", async () => {
    const firmado = await firmarRespaldoDeHost("motul", SECRETO);

    await expect(verificarRespaldoDeHost(firmado, SECRETO)).resolves.toBe(
      "motul",
    );
  });

  it("con otro secreto, la firma no verifica", async () => {
    const firmado = await firmarRespaldoDeHost("motul", SECRETO);

    await expect(
      verificarRespaldoDeHost(firmado, "otro-secreto"),
    ).resolves.toBeNull();
  });

  /**
   * El caso que cierra el hallazgo: un atacante no tiene el secreto, asi
   * que no puede construir un valor que verifique como si fuera de otro
   * municipio.
   */
  it("un valor inventado, sin el secreto, no verifica", async () => {
    await expect(
      verificarRespaldoDeHost("ticul.cualquier-cosa-que-parezca-hex", SECRETO),
    ).resolves.toBeNull();
  });

  it("cambiar el subdominio sin volver a firmar no verifica", async () => {
    const firmado = await firmarRespaldoDeHost("motul", SECRETO);
    const firma = firmado.slice(firmado.lastIndexOf("."));
    const falsificado = `ticul${firma}`;

    await expect(
      verificarRespaldoDeHost(falsificado, SECRETO),
    ).resolves.toBeNull();
  });

  it("undefined no verifica", async () => {
    await expect(
      verificarRespaldoDeHost(undefined, SECRETO),
    ).resolves.toBeNull();
  });

  it("una cadena sin punto separador no verifica", async () => {
    await expect(
      verificarRespaldoDeHost("sinpuntoseparador", SECRETO),
    ).resolves.toBeNull();
  });
});
