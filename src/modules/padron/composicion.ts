import {
  crearAltaDePersona,
  crearBuscarPersonas,
  crearDarDeBajaPersona,
  crearEditarPersona,
  crearFusionarPersonas,
  crearListarPersonas,
  crearRevertirFusion,
  crearSugerirDuplicados,
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
export const buscarPersonas = crearBuscarPersonas(
  repositorioDePersonasSql,
  catalogoDeAbreviaturasSql,
);
export const fusionarPersonas = crearFusionarPersonas(repositorioDePersonasSql);
export const revertirFusion = crearRevertirFusion(repositorioDePersonasSql);
export const sugerirDuplicados = crearSugerirDuplicados(
  repositorioDePersonasSql,
  catalogoDeAbreviaturasSql,
);
