import type { ContextoActual } from "@/shared/auth/contexto";

/**
 * Cuantos titulares ofrece el buscador de la emision. Menos que la pagina
 * del padron (50): aca se elige una persona para un documento, no se
 * recorre el padron, y una lista de cincuenta nombres con la hoja de la
 * constancia abajo deja la eleccion fuera de la pantalla.
 */
export const LIMITE_DE_TITULARES = 10;

/**
 * Un resultado del padron tal como lo entrega el adaptador, con la fecha de
 * baja incluida: `buscarTitulares` la usa para dejar fuera a quien ya no
 * esta, y no la publica.
 */
export type TitularCandidato = {
  id: string;
  nombreCompleto: string;
  curp: string | null;
  bajaEn: Date | null;
};

/**
 * Puerto contra `padron`, sin transaccion: el adaptador real
 * (`infrastructure/lectorDeTitularesPorPadron.ts`) llama al caso de uso
 * `buscarPersonas`, que abre su propio `withTenant` —el de `padron`—,
 * mismo criterio que `LecturaDeTitulares`.
 */
export type BusquedaDeTitulares = {
  buscar(
    cadena: string,
    limite: number,
  ): Promise<{
    candidatos: readonly TitularCandidato[];
    hayMas: boolean;
  }>;
};

/** Lo que la pantalla pinta de cada resultado: nombre y CURP, nada mas. */
export type TitularEncontrado = {
  id: string;
  nombreCompleto: string;
  curp: string | null;
};

export type ResultadoDeBusquedaDeTitulares = {
  readonly titulares: readonly TitularEncontrado[];
  /** De `padron`: los resultados no cupieron en `LIMITE_DE_TITULARES`. */
  readonly hayMas: boolean;
};

/**
 * S4 de `constancias-ux`: buscar a la persona desde la propia pantalla de
 * emision, en vez de un callejon que solo decia «Ir al padron».
 *
 * **Sin guarda de rol**, mismo criterio que `buscarPersonas` de `padron`:
 * buscar en el padron no es escribirlo, y la pantalla que llama a esto ya
 * exige `puedeEscribir` para dibujarse.
 *
 * Quien esta dado de baja no se ofrece: su constancia la rechaza
 * `emitirConstancia` con `TitularDadoDeBajaError`, y listarlo seria ofrecer
 * un camino que termina en error despues de elegir.
 */
export function crearBuscarTitulares(
  crearBusqueda: (contexto: ContextoActual) => BusquedaDeTitulares,
) {
  return async function buscarTitulares(
    cadena: string,
    contexto: ContextoActual,
  ): Promise<ResultadoDeBusquedaDeTitulares> {
    const texto = cadena.trim();

    // Sin cadena la pantalla esta en su estado inicial: buscar la cadena
    // vacia devolveria el padron entero por similitud cero.
    if (!texto) return { titulares: [], hayMas: false };

    const { candidatos, hayMas } = await crearBusqueda(contexto).buscar(
      texto,
      LIMITE_DE_TITULARES,
    );

    return {
      titulares: candidatos
        .filter((candidato) => candidato.bajaEn === null)
        .map(({ id, nombreCompleto, curp }) => ({ id, nombreCompleto, curp })),
      hayMas,
    };
  };
}
