import {
  avisoATrasladar,
  CABECERA_AVISO,
  NOMBRE_COOKIE_AVISO,
  RUTA_COOKIE_AVISO,
} from "./modules/usuarios/ui/avisoEnTransito";
import {
  CABECERA_CLAVE_MOSTRADA,
  claveATrasladar,
  NOMBRE_COOKIE_CLAVE_MOSTRADA,
  RUTA_COOKIE_CLAVE_MOSTRADA,
} from "./modules/usuarios/ui/claveMostradaEnTransito";

/**
 * Lo que el proxy consume de una peticion antes de que corra la pagina: la
 * contrasenia temporal (S2 de `usuarios-ux`) y el aviso de la baja (S13 y
 * S14). Vive aca y no en `proxy.ts` porque ese archivo esta en el limite de
 * 200 lineas que pide `AGENTS.md`, y porque lo que decide cada traslado ya
 * tiene su propio test por traslado.
 *
 * **Las dos comparten forma**: una cookie httpOnly de vida corta que se
 * mueve a una cabecera del request y se borra en la misma respuesta, en la
 * unica peticion que trae el token en la URL. Un Server Component no puede
 * borrar cookies (doc de `cookies` de Next 16), asi que el proxy es el unico
 * lugar donde el consumo ocurre una sola vez.
 */

export type Traslado = {
  /** La cabecera del request donde viaja el valor; el cliente no la escribe. */
  cabecera: string;
  valor: string;
  /** La cookie que se borra, con su `Path` exacto. */
  cookie: string;
  ruta: string;
};

/**
 * Las cabeceras que escribe este modulo. El proxy borra las que mande el
 * cliente **antes** de decidir: sin eso, cualquiera inyectaria una clave o
 * una baja ajena con una cabecera y un token inventados.
 */
export const CABECERAS_DE_TRASLADO = [
  CABECERA_CLAVE_MOSTRADA,
  CABECERA_AVISO,
] as const;

/**
 * Si esta peticion pide el payload de la ruta y no una pagina entera.
 *
 * Las dos formas de pedirlo cuentan, porque las dos terminan en un payload que
 * el router guarda y reutiliza al volver con «Atras»: el router del cliente
 * manda `rsc: 1` (`node_modules/next/dist/esm/client/components/router-reducer/fetch-server-response.js:48`,
 * Next 16.3.1) y el pre-render del destino de un `redirect` de Server Action
 * pide el payload con `Accept: text/x-component` —el tipo de contenido del
 * payload, `client/components/app-router-headers.js:15`— desde el servidor y
 * **sin** `rsc` (`router-reducer/reducers/server-action-reducer.js:162`: «the
 * server pre-fetches the redirect target as RSC»). Una navegacion de documento
 * pide `text/html`.
 *
 * Se lee aca y no en la pagina porque de eso depende que el proxy consuma o no
 * la cookie de la clave: ver `claveATrasladar`.
 */
export const pideElPayload = (cabeceras: Headers): boolean =>
  cabeceras.get("rsc") === "1" ||
  (cabeceras.get("accept") ?? "").includes(TIPO_DE_CONTENIDO_DEL_PAYLOAD);

const TIPO_DE_CONTENIDO_DEL_PAYLOAD = "text/x-component";

export const trasladosDeLaPeticion = ({
  metodo,
  ruta,
  consulta,
  leerCookie,
  esPayload,
}: {
  metodo: string;
  ruta: string;
  consulta: URLSearchParams;
  leerCookie: (nombre: string) => string | undefined;
  esPayload: boolean;
}): readonly Traslado[] => {
  const clave = claveATrasladar({
    metodo,
    ruta,
    token: consulta.get("clave") ?? undefined,
    cookie: leerCookie(NOMBRE_COOKIE_CLAVE_MOSTRADA),
    esPayload,
  });
  const aviso = avisoATrasladar({
    metodo,
    ruta,
    token: consulta.get("aviso") ?? undefined,
    cookie: leerCookie(NOMBRE_COOKIE_AVISO),
  });

  const traslados: Traslado[] = [];
  if (clave) {
    traslados.push({
      cabecera: CABECERA_CLAVE_MOSTRADA,
      valor: clave,
      cookie: NOMBRE_COOKIE_CLAVE_MOSTRADA,
      ruta: RUTA_COOKIE_CLAVE_MOSTRADA,
    });
  }
  if (aviso) {
    traslados.push({
      cabecera: CABECERA_AVISO,
      valor: aviso,
      cookie: NOMBRE_COOKIE_AVISO,
      ruta: RUTA_COOKIE_AVISO,
    });
  }

  return traslados;
};
