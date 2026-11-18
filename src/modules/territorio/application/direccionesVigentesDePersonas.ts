import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import {
  calleYNumero,
  etiquetaDeDomicilio,
  type PartesDeDireccion,
} from "../domain";
import type { LectorDeDireccionesEnLote } from "./puertosDeDirecciones";
import type {
  RepositorioDeResidencias,
  ResidenciaGuardada,
} from "./puertosDeResidencias";

/**
 * `personaId` -> etiqueta de su domicilio vigente. Ausente es "no tiene": o no
 * hay residencia abierta, o su direccion ya no se puede leer (lugar de baja,
 * RLS). Quien consume el mapa muestra el mismo texto en los dos casos.
 */
export type DireccionesVigentesDePersonas = ReadonlyMap<string, string>;

/**
 * La etiqueta de las listas y del buscador, la misma que arma
 * `historialDeResidencias.ts` -que es donde vive la regla-: calle y numero,
 * lugar y asentamiento.
 */
const etiquetaDe = (partes: PartesDeDireccion): string => {
  const [lugar] = partes.ancestros;
  if (lugar === undefined) {
    return calleYNumero({ calle: partes.calle, numero: partes.numero });
  }

  return etiquetaDeDomicilio({
    calle: partes.calle,
    numero: partes.numero,
    lugar,
    raiz: partes.ancestros.at(-1),
  });
};

/**
 * Una residencia abierta por persona. `historialDe` llega ordenado `desdeEn
 * DESC, creadoEn DESC`, asi que la primera fila abierta de cada identidad es
 * la suya y `residencias_una_abierta_idx` garantiza que hay a lo sumo una.
 */
const vigentesPorPersona = (
  historial: readonly ResidenciaGuardada[],
): ReadonlyMap<string, ResidenciaGuardada> => {
  const vigentes = new Map<string, ResidenciaGuardada>();

  for (const residencia of historial) {
    if (residencia.hastaEn === null && !vigentes.has(residencia.personaId)) {
      vigentes.set(residencia.personaId, residencia);
    }
  }

  return vigentes;
};

/**
 * Donde vive hoy cada persona de una pagina, en **una** lectura: una consulta
 * de residencias para todos los ids y una de direcciones para todos los
 * domicilios. Pedirlo persona por persona seria un N+1 por pantalla, el mismo
 * motivo que `conUbicaciones` de `reportes`.
 *
 * **No expande identidades fusionadas.** `identidadesDe` es de `padron` y
 * pedirla por persona reintroduciria el N+1 que esta lectura evita, asi que
 * quien llama pasa todas las identidades que colapsan en cada persona;
 * `fusionarPersonas` no toca `residencias` y la perdedora puede conservar la
 * residencia abierta.
 */
export function crearDireccionesVigentesDePersonas(
  repositorio: RepositorioDeResidencias,
  lectorDeDirecciones: LectorDeDireccionesEnLote,
) {
  return async function direccionesVigentesDePersonas(
    personaIds: readonly string[],
    contexto: ContextoActual,
  ): Promise<DireccionesVigentesDePersonas> {
    if (personaIds.length === 0) return new Map();

    return withTenant(contexto.ayuntamientoId, async (tx) => {
      const vigentes = vigentesPorPersona(
        await repositorio.historialDe(tx, personaIds),
      );
      if (vigentes.size === 0) return new Map();

      const partes = await lectorDeDirecciones.partesDeVarios(tx, [
        ...new Set(
          [...vigentes.values()].map(({ domicilioId }) => domicilioId),
        ),
      ]);

      const direcciones = new Map<string, string>();
      for (const [personaId, { domicilioId }] of vigentes) {
        const direccion = partes.get(domicilioId);
        if (direccion) direcciones.set(personaId, etiquetaDe(direccion));
      }

      return direcciones;
    });
  };
}
