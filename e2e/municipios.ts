/**
 * Los dos municipios del E2E, con subdominios **fijos**.
 *
 * Los tests de integracion los aleatorizan (`motul-${uuid}`) para que dos
 * corridas no se pisen. Aca no se puede: el subdominio es parte de la URL
 * que abre el navegador y de la que Playwright espera, asi que tiene que
 * conocerse antes de arrancar.
 *
 * Con `DOMINIO_BASE=localhost`, `motul.localhost:3000` resuelve al
 * subdominio `motul`. Chromium mapea todo `*.localhost` al loopback por
 * especificacion, asi que no hace falta tocar `/etc/hosts`.
 */

export const MUNICIPIOS = {
  motul: {
    id: "e2e00000-0000-4000-8000-000000000001",
    subdominio: "motul",
    nombre: "Motul",
  },
  ticul: {
    id: "e2e00000-0000-4000-8000-000000000002",
    subdominio: "ticul",
    nombre: "Ticul",
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

export const urlDe = (municipio: keyof typeof MUNICIPIOS, ruta = "/") =>
  `http://${MUNICIPIOS[municipio].subdominio}.localhost:${PUERTO}${ruta}`;
