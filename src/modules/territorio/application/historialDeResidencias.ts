import type { ContextoActual } from "@/shared/auth/contexto";
import { NoEncontradoError } from "@/shared/lib/errores";
import { withTenant } from "@/shared/tenancy/withTenant";
import {
  calleYNumero,
  etiquetaDeDomicilio,
  type PartesDeDireccion,
} from "../domain";
import type { LectorDeDirecciones } from "./puertosDeDirecciones";
import type {
  LecturaDePersonas,
  RepositorioDeResidencias,
  ResidenciaGuardada,
} from "./puertosDeResidencias";

/**
 * `texto` es `null` cuando `partesDe` no encuentra el domicilio: la
 * residencia sigue en el historial aunque su direccion ya no se pueda leer.
 */
export type ResidenciaConDireccion = ResidenciaGuardada & {
  texto: string | null;
};

/**
 * Sin guarda de rol: leer el historial no es escribirlo, mismo criterio
 * que `listarCalles`/`personaPorId`. `identidadesDe` trae todos los ids
 * que colapsan en `personaId` -uno si nunca se fusiono, dos o mas si si-
 * asi que `historialDe` los cita todos en una sola consulta (design.md
 * seccion 8, "El camino de lectura del colapso"). La "residencia vigente"
 * la elige quien consume el resultado -primera fila con `hastaEn` null en
 * el orden `desdeEn DESC, creadoEn DESC` que ya trae `historialDe`-, nunca
 * este caso de uso: no hay escritura que reconciliar.
 *
 * El texto de cada fila es la `etiquetaDeDomicilio` de las listas y del
 * buscador, no el `componerDireccion` de la constancia: en la ficha el
 * operador elige y compara contra esas listas. Una lectura por residencia,
 * dentro de la misma transaccion; el historial de una persona son pocas
 * filas.
 */
/** `ancestros` va del lugar del domicilio a su asentamiento, la raiz. */
const etiquetaDe = ({ calle, numero, ancestros }: PartesDeDireccion) => {
  const [lugar] = ancestros;
  if (lugar === undefined) return calleYNumero({ calle, numero });

  return etiquetaDeDomicilio({ calle, numero, lugar, raiz: ancestros.at(-1) });
};

export function crearHistorialDeResidencias(
  repositorio: RepositorioDeResidencias,
  lectorDeDirecciones: LectorDeDirecciones,
  crearLecturaDePersonas: (contexto: ContextoActual) => LecturaDePersonas,
) {
  return async function historialDeResidencias(
    personaId: string,
    contexto: ContextoActual,
  ): Promise<readonly ResidenciaConDireccion[]> {
    const lecturaDePersonas = crearLecturaDePersonas(contexto);
    const identidades = await lecturaDePersonas.identidadesDe(personaId);
    if (identidades.length === 0) throw new NoEncontradoError();

    return withTenant(contexto.ayuntamientoId, async (tx) => {
      const historial = await repositorio.historialDe(tx, identidades);
      const conDireccion: ResidenciaConDireccion[] = [];

      for (const residencia of historial) {
        const partes = await lectorDeDirecciones.partesDe(
          tx,
          residencia.domicilioId,
        );
        conDireccion.push({
          ...residencia,
          texto: partes ? etiquetaDe(partes) : null,
        });
      }

      return conDireccion;
    });
  };
}
