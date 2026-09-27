/**
 * Los dos municipios del E2E, con subdominios **fijos**.
 *
 * Los tests de integracion los aleatorizan (`motul-${uuid}`) para que dos
 * corridas no se pisen. Aca no se puede: el subdominio es parte de la URL
 * que abre el navegador y de la que Playwright espera, asi que tiene que
 * conocerse antes de arrancar.
 *
 * Con `DOMINIO_BASE=xula.localhost`, `motul.xula.localhost:3000` resuelve
 * al subdominio `motul`. Chromium mapea todo `*.localhost` al loopback por
 * especificacion, asi que no hace falta tocar `/etc/hosts`.
 *
 * El dominio base **no puede ser `localhost` pelado**: es el host interno
 * del servidor, y `proxy.ts` explica que pasa si coinciden.
 */

export const MUNICIPIOS = {
  motul: {
    id: "e2e00000-0000-4000-8000-000000000001",
    subdominio: "motul",
    nombre: "H. Ayuntamiento de Motul de Carrillo Puerto, Yucatán",
    marca: {
      escudo: `http://motul.xula.localhost:${process.env.E2E_PUERTO ?? "3000"}/api/salud`,
    },
  },
  ticul: {
    id: "e2e00000-0000-4000-8000-000000000002",
    subdominio: "ticul",
    nombre: "Ticul",
    marca: {},
  },
} as const;

/**
 * El mismo correo y la misma clave en los dos, a proposito: es el caso
 * incomodo. Si el acceso resolviera sin filtrar por tenant, entrar en Motul
 * podria devolver la persona de Ticul.
 */
export const CORREO = "tesoreria@example.com";
export const CLAVE = "clave-larga-y-buena";

/**
 * El puerto sale del entorno para poder correr el E2E con un `next dev`
 * ocupando el 3000. Sin esto habia que apagar el servidor de trabajo para
 * verificar un test.
 */
export const PUERTO = process.env.E2E_PUERTO ?? "3000";

/** El mismo valor que `playwright.config.ts` le pasa al servidor. */
export const DOMINIO_BASE = "xula.localhost";

export const urlDe = (municipio: keyof typeof MUNICIPIOS, ruta = "/") =>
  `http://${MUNICIPIOS[municipio].subdominio}.${DOMINIO_BASE}:${PUERTO}${ruta}`;

/** El dominio base pelado, sin municipio: la superficie `raiz`. */
export const urlDeLaRaiz = (ruta = "/") =>
  `http://${DOMINIO_BASE}:${PUERTO}${ruta}`;

/**
 * Un subdominio con forma valida que ningun municipio tiene. Distinto del
 * dominio base pelado: aca el proxy si escribe `superficie: ayuntamiento`,
 * y la ausencia de municipio solo se descubre contra la base.
 */
export const SUBDOMINIO_SIN_MUNICIPIO = "otro";

export const urlDeSinMunicipio = (ruta = "/") =>
  `http://${SUBDOMINIO_SIN_MUNICIPIO}.${DOMINIO_BASE}:${PUERTO}${ruta}`;
