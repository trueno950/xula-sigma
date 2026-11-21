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

export const trasladosDeLaPeticion = ({
  metodo,
  ruta,
  consulta,
  leerCookie,
}: {
  metodo: string;
  ruta: string;
  consulta: URLSearchParams;
  leerCookie: (nombre: string) => string | undefined;
}): readonly Traslado[] => {
  const clave = claveATrasladar({
    metodo,
    ruta,
    token: consulta.get("clave") ?? undefined,
    cookie: leerCookie(NOMBRE_COOKIE_CLAVE_MOSTRADA),
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
