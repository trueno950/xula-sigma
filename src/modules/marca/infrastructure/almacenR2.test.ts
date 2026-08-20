import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `almacenR2.guardar` y el PUT/DELETE efectivos contra un bucket real no
 * tienen test aqui — necesitan credenciales de R2 (design.md seccion 3).
 * Lo que SI se prueba, con `S3Client` mockeado: que `borrar` solo emite
 * `DeleteObjectCommand` cuando `claveTenantDesdeUrl` aprueba la URL, la
 * regla de seguridad que motiva este archivo (finding de revision: un
 * borrado sin aislamiento por tenant y sin comparacion de origen).
 */

const enviar = vi.fn();

vi.mock("@aws-sdk/client-s3", () => {
  class S3ClientDeMentira {
    send = enviar;
  }

  class PutObjectCommandDeMentira {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }

  class DeleteObjectCommandDeMentira {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }

  return {
    S3Client: S3ClientDeMentira,
    PutObjectCommand: PutObjectCommandDeMentira,
    DeleteObjectCommand: DeleteObjectCommandDeMentira,
  };
});

const ENV_R2 = {
  R2_ENDPOINT: "https://cuenta.r2.cloudflarestorage.com",
  R2_BUCKET: "xula-assets",
  R2_ACCESS_KEY_ID: "clave-de-prueba",
  R2_SECRET_ACCESS_KEY: "secreto-de-prueba",
  R2_PUBLIC_URL: "https://assets.xulasigma.mx",
};

describe("almacenR2.borrar", () => {
  beforeEach(() => {
    vi.resetModules();
    enviar.mockReset();
    enviar.mockResolvedValue(undefined);

    for (const [llave, valor] of Object.entries(ENV_R2)) {
      vi.stubEnv(llave, valor);
    }
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("borra la clave propia cuando la URL es del propio ayuntamiento", async () => {
    const { almacenR2 } = await import("./almacenR2");

    await almacenR2.borrar(
      "motul",
      "https://assets.xulasigma.mx/motul/escudo-x.png",
    );

    expect(enviar).toHaveBeenCalledTimes(1);
    const comando = enviar.mock.calls[0]?.[0] as { input: unknown };
    expect(comando.input).toEqual({
      Bucket: "xula-assets",
      Key: "motul/escudo-x.png",
    });
  });

  it("no-opea sobre la clave de otro ayuntamiento en el mismo host", async () => {
    const { almacenR2 } = await import("./almacenR2");

    await almacenR2.borrar(
      "motul",
      "https://assets.xulasigma.mx/ticul/escudo-x.png",
    );

    expect(enviar).not.toHaveBeenCalled();
  });

  it("no-opea ante un host que solo comparte el prefijo de texto", async () => {
    const { almacenR2 } = await import("./almacenR2");

    await almacenR2.borrar(
      "motul",
      "https://assets.xulasigma.mx.evil.com/motul/escudo-x.png",
    );

    expect(enviar).not.toHaveBeenCalled();
  });
});
