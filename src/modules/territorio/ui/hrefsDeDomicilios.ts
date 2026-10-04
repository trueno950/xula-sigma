import type {
  DomicilioDelRegistro,
  FiltrosDeRegistro,
} from "../application/puertosDeDomicilios";
import {
  LIMITE_MAXIMO,
  TAMANO_DE_PAGINA,
} from "../application/registroDeDomicilios";
import { rutaDe } from "./contenido";

type ParametrosDeListado = {
  readonly filtros?: FiltrosDeRegistro | undefined;
  readonly limite?: number | undefined;
};

/**
 * El `?q=&numero=&raiz=&limite=` de `/territorio/domicilios`, sin cliente:
 * "Ver mas" es un link con query params, nunca `useState` -mismo criterio
 * que `reportes/ui/hrefsDeListado.ts`.
 *
 * `limite` se omite cuando es el default para no ensuciar la URL del
 * registro sin filtrar.
 */
export function construirHrefDeDomicilios(
  parametros: ParametrosDeListado,
): string {
  const query = new URLSearchParams();

  if (parametros.filtros?.calle) query.set("q", parametros.filtros.calle);
  if (parametros.filtros?.numero)
    query.set("numero", parametros.filtros.numero);
  if (parametros.filtros?.raizId) query.set("raiz", parametros.filtros.raizId);
  if (parametros.limite && parametros.limite !== TAMANO_DE_PAGINA) {
    query.set("limite", String(parametros.limite));
  }

  const cadena = query.toString();
  return cadena ? `/territorio/domicilios?${cadena}` : "/territorio/domicilios";
}

/**
 * El link "Ver mas": mismos filtros, `limite` actual mas un tamano de
 * pagina. Nunca resta ni reinicia -y se queda en `LIMITE_MAXIMO` en vez de
 * pasarlo, porque el esquema de la ruta descarta lo que lo excede y la
 * pantalla volveria a la primera pagina sin avisar.
 */
export function hrefDeVerMasDeDomicilios(
  parametros: ParametrosDeListado,
): string {
  const limiteActual = parametros.limite ?? TAMANO_DE_PAGINA;

  return construirHrefDeDomicilios({
    ...parametros,
    limite: Math.min(limiteActual + TAMANO_DE_PAGINA, LIMITE_MAXIMO),
  });
}

/** La misma pantalla sin uno de sus filtros: el limite vuelve a la primera pagina. */
export function hrefSinFiltroDeDomicilios(
  filtros: FiltrosDeRegistro,
  quitar: keyof FiltrosDeRegistro,
): string {
  const { [quitar]: _quitado, ...restantes } = filtros;

  return construirHrefDeDomicilios({ filtros: restantes });
}

/**
 * El panel del domicilio dentro de su lugar. El registro no trae el
 * asentamiento de cada fila, asi que la raiz sale de lo que la pantalla ya
 * sabe: el filtro de asentamiento (todo lo listado cuelga de el) o el
 * propio lugar cuando es un asentamiento. Sin ninguno de los dos devuelve
 * `undefined` y la fila no promete un enlace que no puede armar.
 */
export function hrefDeDomicilioDelRegistro(
  domicilio: Pick<DomicilioDelRegistro, "id" | "lugarId">,
  contexto: { filtros: FiltrosDeRegistro; raices: readonly string[] },
): string | undefined {
  const raizId =
    contexto.filtros.raizId ??
    (contexto.raices.includes(domicilio.lugarId)
      ? domicilio.lugarId
      : undefined);
  if (!raizId) return undefined;

  return `${rutaDe({
    raizId,
    nodoId: domicilio.lugarId,
    vista: "domicilios",
    domicilioId: domicilio.id,
  })}#panel-de-domicilio`;
}
