/**
 * Lectura del subdominio a partir del Host de la peticion.
 *
 * Logica pura, sin IO. Vive separada del resto de tenancy porque de su
 * resultado depende contra que municipio se resuelve TODO el request, y
 * eso merece poder testearse en milisegundos y sin base de datos.
 *
 * El Host lo manda el cliente. Todo lo que sigue trata esa cadena como
 * entrada hostil: se normaliza, se valida forma, y solo se acepta lo que
 * calza exacto. Ante la duda, `invalido` — nunca un tenant por defecto.
 */

/**
 * El dominio base cuando el entorno no lo fija.
 *
 * **No es `localhost` a secas**, y el motivo esta en `proxy.ts`: si el
 * dominio base coincidiera con el host interno del servidor, el render
 * sintetico del redirect de un Server Action se leeria como `raiz` en vez
 * de `invalido` y el respaldo por `x-forwarded-host` no correria.
 *
 * `xula.localhost` sirve para desarrollo sin tocar `/etc/hosts`: Chromium
 * mapea todo `*.localhost` al loopback por especificacion, asi que
 * `motul.xula.localhost` resuelve igual que `motul.localhost`.
 */
export const DOMINIO_BASE_POR_DEFECTO = "xula.localhost";

/**
 * Hosts con los que el servidor se llama a si mismo.
 *
 * Es la unica firma que habilita el respaldo por `x-forwarded-host` en
 * `proxy.ts`. Por que hace falta que sea esta y no "el host no cuelga del
 * dominio base" esta en `proxyRespaldo.test.ts`.
 *
 * La forma con corchetes es la del Host header: RFC 7230 exige que una
 * direccion IPv6 viaje como `[::1]`, nunca pelada. Eso es lo que deja
 * recortar el puerto con un solo patron -`[::1]` termina en `]`, asi que
 * no matchea-, y es la razon de que `::1` no este en la lista: no puede
 * llegar por Host.
 */
const HOSTS_INTERNOS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function esHostInterno(host: string | null | undefined): boolean {
  if (!host) return false;

  return HOSTS_INTERNOS.has(host.toLowerCase().replace(/:\d+$/, ""));
}

export type Subdominio =
  | { tipo: "ayuntamiento"; subdominio: string }
  | { tipo: "admin" }
  | { tipo: "raiz" }
  | { tipo: "invalido" };

/**
 * Nombres que no pueden ser un municipio. Sin esta lista, dar de alta un
 * ayuntamiento llamado `api` o `mail` secuestraria esa superficie.
 *
 * `www` y `admin` no estan aca porque no son invalidos: tienen destino
 * propio.
 */
const RESERVADOS = new Set([
  "api",
  "assets",
  "cdn",
  "correo",
  "ftp",
  "mail",
  "smtp",
  "static",
  "webmail",
]);

/**
 * Etiqueta DNS: entre 2 y 63 caracteres, alfanumerica en los extremos,
 * con guiones permitidos solo en el medio.
 *
 * El minimo de 2 es nuestro, no del DNS: un subdominio de un caracter es
 * casi siempre un dedazo, y no vale la pena que resuelva a un municipio.
 */
const ETIQUETA = /^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/;

export function leerSubdominio(
  host: string | null | undefined,
  dominioBase: string,
): Subdominio {
  if (!host) return { tipo: "invalido" };

  // El puerto no es parte del nombre. Se quita despues de normalizar para
  // no depender de mayusculas en el host.
  const limpio = host.toLowerCase().replace(/:\d+$/, "");
  const base = dominioBase.toLowerCase();

  if (limpio === base) return { tipo: "raiz" };

  // Comparacion contra `.base`, no `endsWith(base)` pelado. Un
  // `endsWith` aceptaria `noxulasigma.mx`, que es un dominio ajeno que
  // solo termina parecido — y aceptarlo seria dejar que un tercero elija
  // el tenant.
  const sufijo = `.${base}`;
  if (!limpio.endsWith(sufijo)) return { tipo: "invalido" };

  const resto = limpio.slice(0, -sufijo.length);

  // Un punto adentro significa subdominio anidado. No se soportan: el
  // wildcard de DNS cubre un solo nivel.
  if (resto.includes(".")) return { tipo: "invalido" };

  if (resto === "admin") return { tipo: "admin" };
  if (resto === "www") return { tipo: "raiz" };
  if (RESERVADOS.has(resto)) return { tipo: "invalido" };
  if (!ETIQUETA.test(resto)) return { tipo: "invalido" };

  return { tipo: "ayuntamiento", subdominio: resto };
}
