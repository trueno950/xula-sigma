import {
  crearAltaDePersona,
  crearDarDeBajaPersona,
  crearEditarPersona,
  crearListarPersonas,
} from "./application";
import {
  catalogoDeAbreviaturasSql,
  repositorioDePersonasSql,
} from "./infrastructure";

/**
 * Raiz de composicion del modulo (precedente: `marca/composicion.ts`).
 * Solo cableado: no importa `./ui` ni `./index` por la misma razon que
 * `marca/composicion.ts` — cualquiera de los dos cierra un ciclo.
 */
export const altaDePersona = crearAltaDePersona(
  repositorioDePersonasSql,
  catalogoDeAbreviaturasSql,
);
export const editarPersona = crearEditarPersona(
  repositorioDePersonasSql,
  catalogoDeAbreviaturasSql,
);
export const darDeBajaPersona = crearDarDeBajaPersona(repositorioDePersonasSql);
export const listarPersonas = crearListarPersonas(repositorioDePersonasSql);
