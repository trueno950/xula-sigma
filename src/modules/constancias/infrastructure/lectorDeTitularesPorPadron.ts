import {
  buscarPersonas,
  comoPersonaId,
  nombreCompletoDe,
  personaPorId,
} from "@/modules/padron";
import type { ContextoActual } from "@/shared/auth/contexto";
import type { BusquedaDeTitulares } from "../application/buscarTitulares";
import type { LecturaDeTitulares } from "../application/puertosDeLectura";

/**
 * Implementacion real de `LecturaDeTitulares` contra el caso de uso de
 * `padron`, no contra su repositorio: `personas` es inalcanzable fuera de
 * `padron` (design.md de `constancias-oficios`, seccion 2), asi que este
 * adaptador es uno de los dos unicos archivos del modulo que pueden cruzar
 * el limite -importando `PersonaId`/`comoPersonaId` de `padron`-, y lo hace
 * por el barrel. El puerto trabaja con `string`; `comoPersonaId` convierte
 * en esta unica frontera, justo antes de llamar a la funcion tipada de
 * `padron`. `personaPorId` abre su propio `withTenant` -el de `padron`-,
 * nunca el de `constancias`.
 */
export const crearLectorDeTitularesPorPadron = (
  contexto: ContextoActual,
): LecturaDeTitulares => ({
  async porId(personaId) {
    const persona = await personaPorId(comoPersonaId(personaId), contexto);
    if (!persona) return null;

    return {
      nombreCompleto: nombreCompletoDe(persona),
      bajaEn: persona.bajaEn,
    };
  },
});

/**
 * El buscador de la emision (S4 de `constancias-ux`) contra el mismo caso de
 * uso que el listado del padron, no contra su repositorio: la busqueda
 * tolerante a variantes -abreviaturas, acentos, trigramas- vive en `padron`,
 * y repetirla aca daria dos respuestas distintas para la misma cadena.
 *
 * `bajaEn` viaja en el candidato porque quien decide dejar fuera a los dados
 * de baja es el caso de uso, no este adaptador.
 */
export const crearBuscadorDeTitularesPorPadron = (
  contexto: ContextoActual,
): BusquedaDeTitulares => ({
  async buscar(cadena, limite) {
    const { personas, hayMas } = await buscarPersonas(cadena, contexto, {
      limite,
    });

    return {
      candidatos: personas.map((persona) => ({
        id: persona.id,
        nombreCompleto: nombreCompletoDe(persona),
        curp: persona.curp,
        bajaEn: persona.bajaEn,
      })),
      hayMas,
    };
  },
});
