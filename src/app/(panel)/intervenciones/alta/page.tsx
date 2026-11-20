import type { Metadata } from "next";
import { z } from "zod";
import {
  ETIQUETA_DE_TIPO_DE_INTERVENCION,
  FormularioDeAltaDeIntervencion,
  TIPOS_DE_INTERVENCION,
} from "@/modules/intervenciones";
import { borradorDeLaPeticion } from "@/modules/intervenciones/ui/borradorEnCookie";
import type { CallesDelAlta } from "@/modules/intervenciones/ui/FormularioDeAltaDeIntervencion.calles";
import { gruposDeCalles } from "@/modules/intervenciones/ui/FormularioDeAltaDeIntervencion.calles";
import {
  type LugarGuardado,
  listarCalles,
  listarLugares,
  puedeTenerCatalogoDeCalles,
} from "@/modules/territorio";
import {
  opcionesDeCalles,
  opcionesDeLugares,
} from "@/modules/territorio/ui/opciones";
import { contextoActual } from "@/shared/auth";
import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeAdministrarIntervenciones } from "@/shared/auth/roles";
import { hoyEnMerida } from "@/shared/lib/fecha";
import {
  Migaja,
  opcionesEtiquetadas,
  PaginaDePanel,
  PantallaDeMensaje,
} from "@/shared/ui";

export const metadata: Metadata = { title: "Registrar intervención" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const esquemaDeParametros = z.object({
  /** El token opaco de lo capturado en un rechazo; ver `borradorEnCookie.ts`. */
  borrador: z.string().optional(),
  error: z.string().optional(),
});

/** El asentamiento que tiene `lugar` en su catalogo, o nada si no resuelve. */
const asentamientoDe = (
  porId: ReadonlyMap<string, LugarGuardado>,
  lugar: LugarGuardado,
): string | undefined => {
  const vistos = new Set<string>();
  let actual: LugarGuardado | undefined = lugar;

  // Un ciclo de `padreId` en datos corruptos no puede colgar el render.
  while (actual && !vistos.has(actual.id)) {
    if (puedeTenerCatalogoDeCalles(actual.tipo)) return actual.id;
    vistos.add(actual.id);
    actual = actual.padreId ? porId.get(actual.padreId) : undefined;
  }

  return undefined;
};

/**
 * Las calles se piden una vez por asentamiento y no por lugar (S6 de
 * `intervenciones-ux`): la calle solo puede colgar de ahi, asi que las
 * colonias de un mismo asentamiento comparten la lista.
 */
const callesDelMunicipio = async (
  lugares: readonly LugarGuardado[],
  contexto: ContextoActual,
): Promise<CallesDelAlta> => {
  const asentamientos = lugares.filter((lugar) =>
    puedeTenerCatalogoDeCalles(lugar.tipo),
  );
  const calles = await Promise.all(
    asentamientos.map((asentamiento) =>
      listarCalles(asentamiento.id, contexto),
    ),
  );
  const porId = new Map(lugares.map((lugar) => [lugar.id, lugar]));

  return {
    asentamientoDeLugar: Object.fromEntries(
      lugares.map((lugar) => [lugar.id, asentamientoDe(porId, lugar)]),
    ),
    grupos: gruposDeCalles(
      asentamientos.map((asentamiento, indice) => ({
        asentamientoId: asentamiento.id,
        asentamiento: asentamiento.nombre,
        opciones: opcionesDeCalles(calles[indice] ?? []),
      })),
    ),
  };
};

/**
 * Ruta fina del alta: resuelve lugares y sus calles antes de dibujar el
 * formulario -mismo criterio que `/reportes/alta`-, y compone
 * `@/modules/territorio` junto con `@/modules/intervenciones` porque esta
 * pagina, y no ningun modulo, es el unico lugar autorizado a leer de los dos.
 */
export default async function PaginaDeAltaDeIntervencion({
  searchParams,
}: Props) {
  const contexto = await contextoActual();

  if (!contexto) {
    return <PantallaDeMensaje mensaje="No se pudo determinar su sesión." />;
  }

  if (!puedeAdministrarIntervenciones(contexto.usuario.rol)) {
    return (
      <PantallaDeMensaje mensaje="Su rol no tiene permiso para registrar intervenciones." />
    );
  }

  const analisis = esquemaDeParametros.safeParse(await searchParams);
  const error = analisis.success ? analisis.data.error : undefined;

  const [lugaresGuardados, borrador] = await Promise.all([
    listarLugares(contexto),
    borradorDeLaPeticion(analisis.success ? analisis.data.borrador : undefined),
  ]);
  const calles = await callesDelMunicipio(lugaresGuardados, contexto);

  const tipos = opcionesEtiquetadas(
    TIPOS_DE_INTERVENCION,
    ETIQUETA_DE_TIPO_DE_INTERVENCION,
  );

  return (
    <PaginaDePanel
      titulo="Registrar intervención"
      ancho="formulario"
      migaja={
        <Migaja
          pasos={[
            { etiqueta: "Intervenciones", href: "/intervenciones" },
            { etiqueta: "Registrar intervención" },
          ]}
          etiqueta="Ruta"
        />
      }
    >
      <FormularioDeAltaDeIntervencion
        tipos={tipos}
        lugares={opcionesDeLugares(lugaresGuardados)}
        calles={calles}
        fechaDeHoy={hoyEnMerida()}
        borrador={borrador}
        {...(error ? { error } : {})}
      />
    </PaginaDePanel>
  );
}
