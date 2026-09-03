const CODIFICADOR = new TextEncoder();

/**
 * La cookie con la que el respaldo de `resolverHost` deja de confiar en
 * `x-forwarded-host`. Antes bastaba con que `Host` pareciera loopback
 * -`localhost`, `127.0.0.1`, `[::1]`- para que el proxy leyera el
 * subdominio de una cabecera que tambien controla el cliente; el mismo
 * request que arma `esHostInterno` para el render sintetico de Next lo
 * arma un curl con dos `-H`. Ver `docs/architecture/invariantes-criticos.md`.
 *
 * Firmada con HMAC-SHA256 y `BETTER_AUTH_SECRET`: sin el secreto del
 * servidor no hay forma de producir un valor que verifique, sea cual sea
 * el subdominio que se intente falsificar.
 */
export const NOMBRE_COOKIE_RESPALDO = "x-xula-respaldo";

/**
 * Reusa el secreto de Better Auth en vez de uno propio. Firmar dos cosas
 * distintas -sesion, subdominio- con la misma clave HMAC no las cruza: no
 * hay ataque conocido que reinterprete una firma sobre un mensaje como
 * valida para otro. Y un secreto nuevo es una variable de entorno mas
 * para coordinar en cada entorno, sin necesidad real.
 */
export function leerSecreto(): string {
  const secreto = process.env.BETTER_AUTH_SECRET;

  if (!secreto) {
    throw new Error(
      "Falta BETTER_AUTH_SECRET. El respaldo de host lo firma con el " +
        "mismo secreto que las cookies de sesion; sin el, cualquiera " +
        "falsifica un tenant. Ver .env.example.",
    );
  }

  return secreto;
}

async function claveDeFirma(secreto: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    CODIFICADOR.encode(secreto),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

const comoHex = (bytes: ArrayBuffer): string =>
  Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const HEX = /^[0-9a-f]+$/;

const comoBytes = (hex: string) =>
  new Uint8Array(
    (hex.match(/.{2}/g) ?? []).map((par) => Number.parseInt(par, 16)),
  );

/** Firma un subdominio para que `verificarRespaldoDeHost` lo reconozca. */
export async function firmarRespaldoDeHost(
  subdominio: string,
  secreto: string,
): Promise<string> {
  const clave = await claveDeFirma(secreto);
  const firma = await crypto.subtle.sign(
    "HMAC",
    clave,
    CODIFICADOR.encode(subdominio),
  );

  return `${subdominio}.${comoHex(firma)}`;
}

/**
 * El subdominio que `valor` afirma ser, solo si su firma verifica contra
 * `secreto`. `crypto.subtle.verify` compara en tiempo constante: no hay
 * atajo por comparar byte a byte una firma inventada.
 */
export async function verificarRespaldoDeHost(
  valor: string | undefined,
  secreto: string,
): Promise<string | null> {
  if (!valor) return null;

  const separador = valor.lastIndexOf(".");
  if (separador < 0) return null;

  const subdominio = valor.slice(0, separador);
  const firmaHex = valor.slice(separador + 1);
  if (
    firmaHex.length === 0 ||
    firmaHex.length % 2 !== 0 ||
    !HEX.test(firmaHex)
  ) {
    return null;
  }

  const clave = await claveDeFirma(secreto);
  const esValida = await crypto.subtle.verify(
    "HMAC",
    clave,
    comoBytes(firmaHex),
    CODIFICADOR.encode(subdominio),
  );

  return esValida ? subdominio : null;
}
