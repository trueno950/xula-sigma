import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { AlmacenDeAssets } from "../application/puertos";

/**
 * Adaptador contra R2. Es el unico archivo del repo que importa
 * `@aws-sdk/client-s3` — lo confina la regla
 * `s3-solo-desde-el-almacen-de-assets` de `.dependency-cruiser.cjs`.
 *
 * Las `R2_*` se leen y se validan de forma perezosa, dentro de la primera
 * llamada, y no al importar el modulo. **Diverge a proposito** de
 * `withTenant.ts`, `ritmo.ts` e `instancia.ts`, que lanzan al tope del
 * archivo: esas tres estan en el camino de cada peticion, y un `throw` ahi
 * tumba `next build` sin remedio. `R2_*` esta en el camino de una sola
 * pantalla — sin ellas la aplicacion arranca igual, y solo el primer
 * intento de subida falla.
 */

type ConfiguracionR2 = {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  urlPublica: string;
};

let clienteCache: S3Client | undefined;
let configuracionCache: ConfiguracionR2 | undefined;

function configuracion(): ConfiguracionR2 {
  if (configuracionCache) return configuracionCache;

  const endpoint = process.env.R2_ENDPOINT;
  const bucket = process.env.R2_BUCKET;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const urlPublica = process.env.R2_PUBLIC_URL;

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey || !urlPublica) {
    throw new Error(
      "Falta configuracion de R2 (R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, " +
        "R2_SECRET_ACCESS_KEY o R2_PUBLIC_URL). Ver .env.example.",
    );
  }

  configuracionCache = {
    endpoint,
    bucket,
    accessKeyId,
    secretAccessKey,
    urlPublica,
  };

  return configuracionCache;
}

function clienteDe(config: ConfiguracionR2): S3Client {
  clienteCache ??= new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return clienteCache;
}

/**
 * Sin test unitario: necesita credenciales reales contra un bucket real, y
 * no hay credenciales de R2 en CI. El PUT y el DELETE efectivos, y que
 * `R2_PUBLIC_URL/{clave}` responda 200, son la tarea manual documentada en
 * design.md seccion 3.
 */
export const almacenR2: AlmacenDeAssets = {
  async guardar(clave, bytes) {
    const config = configuracion();

    await clienteDe(config).send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: clave,
        Body: bytes,
        // El bucket es de un solo proposito y el dominio solo acepta PNG
        // (decision 3 de proposal.md): no hay negociacion de tipo aca.
        ContentType: "image/png",
      }),
    );

    return `${config.urlPublica}/${clave}`;
  },

  async borrar(url) {
    const config = configuracion();

    if (!url.startsWith(config.urlPublica)) return;

    await clienteDe(config).send(
      new DeleteObjectCommand({
        Bucket: config.bucket,
        Key: url.slice(config.urlPublica.length + 1),
      }),
    );
  },
};
