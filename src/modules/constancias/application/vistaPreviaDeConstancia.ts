import type { ContextoActual } from "@/shared/auth/contexto";
import { NoEncontradoError } from "@/shared/lib/errores";
import { withTenant } from "@/shared/tenancy/withTenant";
import type {
  LecturaDeAyuntamiento,
  LecturaDeDirecciones,
  LecturaDeTitulares,
  RepositorioDeDocumentos,
} from "./puertosDeLectura";
import { leerDocumentos } from "./validacionDeDocumentos";

/**
 * Lo que la hoja de la constancia necesita, con la misma forma que el
 * snapshot guardado (`datos.titular`, `datos.direccion`, `datos.firmante`)
 * mas el municipio del membrete. `HojaDeConstancia` la recibe tal cual, asi
 * que la vista previa de la emision y la hoja del detalle dicen lo mismo.
 */
export type VistaPreviaDeConstancia = {
  readonly municipio: string;
  readonly titular: { readonly nombreCompleto: string };
  /** Nulo sin residencia vigente: `emitirConstancia` la rechaza ahi mismo. */
  readonly direccion: {
    readonly texto: string;
    readonly desdeEn: string;
  } | null;
  /** Nulo sin bloque de firma configurado: sin firmante no se emite. */
  readonly firmante: {
    readonly nombre: string;
    readonly cargo: string;
    readonly leyendaDePie?: string;
  } | null;
};

/**
 * Lo que la pantalla recibe. La baja del titular no es un fallo de la
 * lectura: es una respuesta legitima -no se le puede emitir- y por eso viaja
 * como estado y no como excepcion. La unica excepcion que queda es la de la
 * regla 8, que es un 404.
 */
export type ResultadoDeVistaPrevia =
  | { readonly clase: "vista"; readonly vista: VistaPreviaDeConstancia }
  | { readonly clase: "titular-dado-de-baja" };

/**
 * Las fuentes de la vista previa, en un objeto y no en cuatro parametros
 * (metrica de `AGENTS.md`). Dos son puertos de otro modulo y dos son de
 * `constancias`, mismo reparto que `crearEmitirConstancia`.
 */
export type FuentesDeVistaPrevia = {
  readonly documentos: RepositorioDeDocumentos;
  readonly ayuntamiento: LecturaDeAyuntamiento;
  readonly crearLecturaDeTitulares: (
    contexto: ContextoActual,
  ) => LecturaDeTitulares;
  readonly crearLecturaDeDirecciones: (
    contexto: ContextoActual,
  ) => LecturaDeDirecciones;
};

/**
 * Las dos lecturas de `constancias` en una sola transaccion y no en dos:
 * `ayuntamientos` es de `shared/tenancy` y `configuracion_de_documentos` de
 * este modulo, asi que ninguna anida un `withTenant` ajeno.
 */
const leerDocumentosYMunicipio = (
  fuentes: FuentesDeVistaPrevia,
  contexto: ContextoActual,
) =>
  withTenant(contexto.ayuntamientoId, async (tx) => {
    const [valor, municipio] = await Promise.all([
      fuentes.documentos.leer(tx, contexto.ayuntamientoId),
      fuentes.ayuntamiento.porId(tx, contexto.ayuntamientoId),
    ]);

    return { documentos: leerDocumentos(valor), municipio };
  });

/** El `firmante` del snapshot, armado desde el bloque de firma guardado. */
const firmanteDe = (
  documentos: ReturnType<typeof leerDocumentos>,
): VistaPreviaDeConstancia["firmante"] => {
  if (!documentos) return null;

  return {
    nombre: documentos.firmanteNombre,
    cargo: documentos.firmanteCargo,
    ...(documentos.leyendaDePie
      ? { leyendaDePie: documentos.leyendaDePie }
      : {}),
  };
};

/**
 * S5 de `constancias-ux`: lo que se va a imprimir, antes de confirmar.
 *
 * **Un solo modelo de lectura para la vista previa y para la emision.** Los
 * dos leen el titular y la direccion por los mismos puertos y el firmante de
 * la misma tabla; si la pantalla los leyera por su cuenta, la hoja que la
 * operadora aprueba y la que se guarda podrian diferir sin que nadie lo
 * note.
 *
 * El titular se valida antes de leer nada mas, en el orden de
 * `emitirConstancia`: sin titular no hay a quien emitirle, y quien esta dado
 * de baja no se puede emitir ahi tampoco. Los dos casos llegan a la pantalla
 * antes de confirmar, no despues.
 */
export function crearVistaPreviaDeConstancia(fuentes: FuentesDeVistaPrevia) {
  return async function vistaPreviaDeConstancia(
    personaId: string,
    contexto: ContextoActual,
  ): Promise<ResultadoDeVistaPrevia> {
    const titular = await fuentes
      .crearLecturaDeTitulares(contexto)
      .porId(personaId);

    // Regla 8: una persona de otro municipio no existe para esta pantalla.
    if (!titular) throw new NoEncontradoError();
    if (titular.bajaEn !== null) return { clase: "titular-dado-de-baja" };

    const direccion = await fuentes
      .crearLecturaDeDirecciones(contexto)
      .vigenteDe(personaId);

    const { documentos, municipio } = await leerDocumentosYMunicipio(
      fuentes,
      contexto,
    );

    if (!municipio) throw new NoEncontradoError();

    return {
      clase: "vista",
      vista: {
        municipio: municipio.nombre,
        titular: { nombreCompleto: titular.nombreCompleto },
        direccion: direccion
          ? { texto: direccion.texto, desdeEn: direccion.desdeEn }
          : null,
        firmante: firmanteDe(documentos),
      },
    };
  };
}
