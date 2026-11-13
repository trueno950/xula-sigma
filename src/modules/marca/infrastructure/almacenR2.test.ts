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

  class GetObjectCommandDeMentira {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }

  return {
    S3Client: S3ClientDeMentira,
    PutObjectCommand: PutObjectCommandDeMentira,
    DeleteObjectCommand: DeleteObjectCommandDeMentira,
    GetObjectCommand: GetObjectCommandDeMentira,
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

describe("lectorR2.leer", () => {
  const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

  beforeEach(() => {
    vi.resetModules();
    enviar.mockReset();
    enviar.mockResolvedValue({
      Body: { transformToByteArray: async () => bytes },
    });

    for (const [llave, valor] of Object.entries(ENV_R2)) {
      vi.stubEnv(llave, valor);
    }
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("lee la clave propia y devuelve los bytes del escudo", async () => {
    const { lectorR2 } = await import("./almacenR2");

    const leidos = await lectorR2.leer(
      "motul",
      "https://assets.xulasigma.mx/motul/escudo-x.png",
    );

    expect(leidos).toEqual(bytes);
    const comando = enviar.mock.calls[0]?.[0] as { input: unknown };
    expect(comando.input).toEqual({
      Bucket: "xula-assets",
      Key: "motul/escudo-x.png",
    });
  });

  /**
   * Una URL que no es de este almacenamiento o no es de este ayuntamiento
   * no se puede entregar en el ZIP, y faltar en silencio dejaria un archivo
   * que parece completo sin el escudo (S4 de `exportacion-de-datos`).
   */
  it("rechaza la URL de otro ayuntamiento sin pedirle nada al almacen", async () => {
    const { lectorR2 } = await import("./almacenR2");

    await expect(
      lectorR2.leer("motul", "https://assets.xulasigma.mx/ticul/escudo-x.png"),
    ).rejects.toThrow(/almacenamiento/);
    expect(enviar).not.toHaveBeenCalled();
  });

  it("rechaza una respuesta sin cuerpo en vez de entregar un escudo vacio", async () => {
    const { lectorR2 } = await import("./almacenR2");
    enviar.mockResolvedValue({});

    await expect(
      lectorR2.leer("motul", "https://assets.xulasigma.mx/motul/escudo-x.png"),
    ).rejects.toThrow(/escudo/);
  });
});
