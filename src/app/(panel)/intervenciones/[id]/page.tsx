import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { z } from "zod";
import {
  AccionesDeIntervencion,
  comoIntervencionId,
  ETIQUETA_DE_ESTADO_DE_INTERVENCION,
  ETIQUETA_DE_TIPO_DE_INTERVENCION,
  FormularioDeCorreccion,
  intervencionConReferencias,
} from "@/modules/intervenciones";
import { contextoActual } from "@/shared/auth";
import { puedeAdministrarIntervenciones } from "@/shared/auth/roles";
import { fechaYHoraEnMerida } from "@/shared/lib/fecha";
import {
  Aviso,
  AvisoDePermiso,
  CLASES_DE_ENLACE,
  FichaDeDatos,
  FilaDeFicha,
  Migaja,
  PaginaDePanel,
  Panel,
  PantallaDeMensaje,
} from "@/shared/ui";

export const metadata: Metadata = { title: "Intervención" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const esquemaDeId = z.string().uuid();
const esquemaDeParametros = z.object({ error: z.string().optional() });

const NO_DISPONIBLE = "No disponible";

const enlaceAlReporte = (
  reporteId: string | null,
  reporte: { id: string; folio: string } | null,
): ReactNode => {
  if (reporteId === null) return "Sin reporte";
  if (reporte === null) return NO_DISPONIBLE;

  return (
    <Link href={`/reportes/detalle/${reporte.id}`} className={CLASES_DE_ENLACE}>
      {reporte.folio}
    </Link>
  );
};

const Dato = ({
  etiqueta,
  valor,
  dato = false,
}: {
  etiqueta: string;
  valor: ReactNode;
  dato?: boolean;
}) => (
  <FilaDeFicha etiqueta={etiqueta} dato={dato}>
    {valor}
  </FilaDeFicha>
);

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
  const puedeAdministrar = puedeAdministrarIntervenciones(contexto.usuario.rol);

  const tipo = ETIQUETA_DE_TIPO_DE_INTERVENCION[intervencion.tipo];

  return (
    <PaginaDePanel
      titulo={`Intervención ${tipo}`}
      ancho="detalle"
      migaja={
        <Migaja
          pasos={[
            { etiqueta: "Intervenciones", href: "/intervenciones" },
            { etiqueta: tipo },
          ]}
          etiqueta="Ruta"
        />
      }
    >
      {error ? <Aviso tono="error">{error}</Aviso> : null}

      {!puedeAdministrar ? (
        <AvisoDePermiso
          capacidad="administrar intervenciones"
          requisito="el rol de administrador municipal"
        />
      ) : null}

      <FichaDeDatos>
        <Dato etiqueta="Tipo" valor={tipo} />
        <Dato
          etiqueta="Estado"
          valor={ETIQUETA_DE_ESTADO_DE_INTERVENCION[intervencion.estado]}
        />
        <Dato
          etiqueta="Fecha de ocurrencia"
          valor={intervencion.fechaDeOcurrencia}
          dato
        />
        <Dato
          etiqueta="Capturado en"
          valor={fechaYHoraEnMerida(intervencion.capturadoEn)}
          dato
        />
        <Dato
          etiqueta="Actualizado en"
          valor={fechaYHoraEnMerida(intervencion.actualizadoEn)}
          dato
        />
        <Dato etiqueta="Lugar" valor={referencias.lugar ?? NO_DISPONIBLE} />
        <Dato
          etiqueta="Calle"
          valor={
            intervencion.calleId === null
              ? "Sin calle"
              : (referencias.calle ?? NO_DISPONIBLE)
          }
        />
        <Dato
          etiqueta="Reporte de origen"
          valor={enlaceAlReporte(intervencion.reporteId, referencias.reporte)}
        />
        <Dato etiqueta="Descripción" valor={intervencion.descripcion} />
      </FichaDeDatos>

      {puedeAdministrar ? (
        <>
          <Panel titulo="Cambiar estado">
            <AccionesDeIntervencion intervencion={intervencion} />
          </Panel>
          <Panel titulo="Corregir intervención">
            <FormularioDeCorreccion intervencion={intervencion} />
          </Panel>
        </>
      ) : null}
    </PaginaDePanel>
  );
}
