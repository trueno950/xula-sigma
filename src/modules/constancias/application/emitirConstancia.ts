import { randomBytes, randomUUID } from "node:crypto";
import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeEscribir } from "@/shared/auth/roles";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { anioEnMerida } from "@/shared/lib/fecha";
import { registrar } from "@/shared/tenancy/bitacora";
import { withTenant } from "@/shared/tenancy/withTenant";
import {
  type ConstanciaId,
  comoConstanciaId,
  DocumentosNoConfiguradosError,
  Folio,
  PREFIJOS,
  SinResidenciaVigenteError,
  TitularDadoDeBajaError,
} from "../domain";
import type { ContadorDeFolios, RepositorioDeConstancias } from "./puertos";
import type {
  LecturaDeDirecciones,
  LecturaDeTitulares,
  RepositorioDeDocumentos,
} from "./puertosDeLectura";
import { leerDocumentos } from "./validacionDeDocumentos";
import { esquemaDeSnapshot, type Snapshot } from "./validacionDeSnapshot";

/**
 * `randomBytes(8).toString("hex")` — 16 caracteres, 64 bits de entropia
 * (design.md de `constancias-oficios`, seccion 8). Viaja solo dentro del QR
 * del documento renderizado, nunca en una respuesta que no lo requiera.
 */
const nuevoCodigo = (): string => randomBytes(8).toString("hex");

/**
 * `emitirConstancia`: el orden exacto de design.md seccion 10.
 *
 * Los pasos 1-3 corren **fuera** de toda transaccion: el rol se valida sin
 * tocar la base, y las dos lecturas de otro modulo abren su propio
 * `withTenant` -anidarlo trabaria el pool con `DB_POOL_MAX=1` y en
 * produccion consumiria dos conexiones por operacion (capa-territorial
 * seccion 6)-. El unico paso que entra a `withTenant` es el 4, y adentro va
 * en el orden que el invariante 1 exige: todo lo que puede rechazar la
 * emision (`leerDocumentos`) corre **antes** de tomar folio, asi que ningun
 * rechazo llega a tocar el contador.
 */
export function crearEmitirConstancia(
  repositorio: RepositorioDeConstancias,
  contador: ContadorDeFolios,
  repositorioDeDocumentos: RepositorioDeDocumentos,
  crearLecturaDeTitulares: (contexto: ContextoActual) => LecturaDeTitulares,
  crearLecturaDeDirecciones: (contexto: ContextoActual) => LecturaDeDirecciones,
) {
  return async function emitirConstancia(
    personaId: string,
    contexto: ContextoActual,
  ): Promise<ConstanciaId> {
    if (!puedeEscribir(contexto.usuario.rol)) throw new NoAutorizadoError();

    const lecturaDeTitulares = crearLecturaDeTitulares(contexto);
    const titular = await lecturaDeTitulares.porId(personaId);
    if (!titular) throw new NoEncontradoError();
    if (titular.bajaEn !== null) throw new TitularDadoDeBajaError();

    const lecturaDeDirecciones = crearLecturaDeDirecciones(contexto);
    const direccion = await lecturaDeDirecciones.vigenteDe(personaId);
    if (!direccion) throw new SinResidenciaVigenteError();

    return withTenant(contexto.ayuntamientoId, async (tx) => {
      const documentos = leerDocumentos(
        await repositorioDeDocumentos.leer(tx, contexto.ayuntamientoId),
      );
      if (!documentos) throw new DocumentosNoConfiguradosError();

      const tipo = "VECINDAD" as const;
      const anio = anioEnMerida();
      const consecutivo = await contador.siguiente(tx, {
        ayuntamientoId: contexto.ayuntamientoId,
        tipo,
        anio,
      });
      const folio = Folio.crear(PREFIJOS[tipo], anio, consecutivo);
      const id = comoConstanciaId(randomUUID());

      const snapshot: Snapshot = esquemaDeSnapshot.parse({
        titular: { nombreCompleto: titular.nombreCompleto },
        direccion: {
          texto: direccion.texto,
          residenciaId: direccion.residenciaId,
          desdeEn: direccion.desdeEn,
        },
        firmante: {
          nombre: documentos.firmanteNombre,
          cargo: documentos.firmanteCargo,
        },
        leyendaDePie: documentos.leyendaDePie,
      });

      await repositorio.guardar(tx, {
        id,
        ayuntamientoId: contexto.ayuntamientoId,
        tipo,
        folio: folio.toString(),
        anio,
        consecutivo,
        codigoVerificacion: nuevoCodigo(),
        personaId,
        datos: snapshot,
        plantillaVersion: "v1",
        emitidaPorUsuarioId: contexto.usuario.id,
      });

      await registrar(tx, {
        ayuntamientoId: contexto.ayuntamientoId,
        actor: contexto.usuario.id,
        origen: contexto.origen,
        accion: "EMITIR_CONSTANCIA",
        entidad: "constancias",
        entidadId: id,
      });

      return id;
    });
  };
}
