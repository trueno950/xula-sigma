import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { z } from "zod";
import type {
  IntervencionGuardada,
  ReferenciasDeIntervencion,
} from "@/modules/intervenciones";
import {
  AccionesDeIntervencion,
  comoIntervencionId,
  DetalleDeIntervencion,
  ETIQUETA_DE_TIPO_DE_INTERVENCION,
  historialDeIntervencion,
  InsigniaDeIntervencion,
  identificadorDeIntervencion,
  intervencionConReferencias,
  PanelDeAcciones,
} from "@/modules/intervenciones";
import { contextoActual } from "@/shared/auth";
import { puedeAdministrarIntervenciones } from "@/shared/auth/roles";
import {
  Aviso,
  AvisoDePermiso,
  Migaja,
  PaginaDePanel,
  PantallaDeMensaje,
} from "@/shared/ui";

export const metadata: Metadata = { title: "Intervención" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const esquemaDeId = z.string().uuid();
const esquemaDeParametros = z.object({ error: z.string().optional() });

/** La linea bajo el titulo: tipo, lugar y calle en una sola lectura (S10). */
const resumenDeIntervencion = (
  intervencion: IntervencionGuardada,
  referencias: ReferenciasDeIntervencion,
): string =>
  [
    ETIQUETA_DE_TIPO_DE_INTERVENCION[intervencion.tipo],
    referencias.lugar,
    referencias.calle,
  ]
    .filter((texto): texto is string => texto !== null)
    .join(" · ");

/**
 * La columna de acciones: el panel para quien administra, el aviso de permiso
 * para quien no -el artboard lo sustituye, no lo esconde-. La guarda real vive
 * en `cambiarEstadoDeIntervencion` y `corregirIntervencion`.
 */
const accionesDe = (
  puedeAdministrar: boolean,
  intervencion: IntervencionGuardada,
): ReactNode => {
  if (!puedeAdministrar) {
    return (
      <AvisoDePermiso
        capacidad="administrar intervenciones"
        requisito="el rol de administrador municipal"
      />
    );
  }

  return (
    <PanelDeAcciones>
      <AccionesDeIntervencion intervencion={intervencion} />
    </PanelDeAcciones>
  );
};

/**
 * El detalle de S10-S15: identificador e insignia en la cabecera, la ficha del
 * hecho separada del registro del sistema, el historial de
 * `revisiones_de_intervenciones` y el panel de acciones en su columna.
 *
 * Ruta fina: resuelve el contexto, lee la ficha con sus referencias, lee el
 * historial y compone. Un id de otro municipio vuelve `null` bajo RLS y la
 * pantalla responde 404 sin distinguirlo de uno inexistente (regla 8).
 */
export default async function PaginaDeDetalleDeIntervencion({
  params,
  searchParams,
}: Props) {
  const contexto = await contextoActual();

  if (!contexto) {
    return <PantallaDeMensaje mensaje="No se pudo determinar su sesión." />;
  }

  const { id } = await params;
  const analisisDeId = esquemaDeId.safeParse(id);
  const ficha = analisisDeId.success
    ? await intervencionConReferencias(
        comoIntervencionId(analisisDeId.data),
        contexto,
      )
    : null;

  if (!ficha) notFound();

  const { intervencion, referencias } = ficha;
  const analisisDeParametros = esquemaDeParametros.safeParse(
    await searchParams,
  );
  const error = analisisDeParametros.success
    ? analisisDeParametros.data.error
    : undefined;
  const historial = await historialDeIntervencion(intervencion, contexto);
  const identificador = identificadorDeIntervencion(intervencion.id);
  const puedeAdministrar = puedeAdministrarIntervenciones(contexto.usuario.rol);

  return (
    <PaginaDePanel
      titulo={identificador}
      descripcion={resumenDeIntervencion(intervencion, referencias)}
      accion={<InsigniaDeIntervencion estado={intervencion.estado} />}
      ancho="detalleAmplio"
      migaja={
        <Migaja
          pasos={[
            { etiqueta: "Intervenciones", href: "/intervenciones" },
            { etiqueta: identificador },
          ]}
          etiqueta="Ruta"
        />
      }
    >
      {error ? <Aviso tono="error">{error}</Aviso> : null}

      <DetalleDeIntervencion
        intervencion={intervencion}
        referencias={referencias}
        historial={historial}
        acciones={accionesDe(puedeAdministrar, intervencion)}
      />
    </PaginaDePanel>
  );
}
