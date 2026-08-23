import type { PorcionExportable } from "@/shared/exportacion/exportar";
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
import { personas } from "./infrastructure/esquema";

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

/**
 * Porcion que padron aporta al exportador de plataforma (design.md
 * decision 6, rebanada 5). Se construye aca -no en `infrastructure`- y
 * sale por el barrel como valor, no como tabla: la porcion aporta sus
 * datos sin abrir su interior.
 *
 * Columnas listadas una por una, nunca `select()` pelado -mismo criterio
 * que `conjuntosDePlataforma` en `exportar.ts`-. Incluye `fusionadaEn` y
 * `fusionadaDirectoEn`: el archivo es el archivo municipal, y esconder el
 * tombstone de una fusion borra la evidencia de que ocurrio. Excluye
 * `ayuntamientoId` -redundante, ya lo sabe quien pide la exportacion,
 * mismo criterio que `usuarios` en `exportar.ts`- y `nombreNormalizado`
 * -artefacto de busqueda derivado del resto de las columnas, no dato del
 * municipio.
 */
export const porcionDePadron: PorcionExportable = {
  nombre: "personas",
  leer: (tx) =>
    tx
      .select({
        id: personas.id,
        nombres: personas.nombres,
        primerApellido: personas.primerApellido,
        segundoApellido: personas.segundoApellido,
        curp: personas.curp,
        bajaEn: personas.bajaEn,
        fusionadaEn: personas.fusionadaEn,
        fusionadaDirectoEn: personas.fusionadaDirectoEn,
        creadoEn: personas.creadoEn,
        actualizadoEn: personas.actualizadoEn,
      })
      .from(personas),
};
