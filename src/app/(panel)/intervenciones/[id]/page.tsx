import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import {
  AccionesDeIntervencion,
  comoIntervencionId,
  ETIQUETA_DE_ESTADO_DE_INTERVENCION,
  ETIQUETA_DE_TIPO_DE_INTERVENCION,
  FormularioDeCorreccion,
  intervencionPorId,
} from "@/modules/intervenciones";
import { contextoActual } from "@/shared/auth";
import { puedeAdministrarIntervenciones } from "@/shared/auth/roles";
import { fechaYHoraEnMerida } from "@/shared/lib/fecha";
import {
  Aviso,
  AvisoDePermiso,
  CLASES_DE_DATO,
  CLASES_DE_ETIQUETA,
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

const Dato = ({
  etiqueta,
  valor,
  dato = false,
}: {
  etiqueta: string;
  valor: string;
  dato?: boolean;
}) => (
  <div className="flex flex-col gap-1">
    <dt className={CLASES_DE_ETIQUETA}>{etiqueta}</dt>
    <dd className={dato ? CLASES_DE_DATO : "text-[15px] text-caliza-tinta"}>
      {valor}
    </dd>
  </div>
);

export default async function PaginaDeDetalleDeIntervencion({
  params,
  searchParams,
}: Props) {
  const contexto = await contextoActual();

  if (!contexto) {
    return <PantallaDeMensaje mensaje="No se pudo determinar su sesion." />;
  }

  const { id } = await params;
  const analisisDeId = esquemaDeId.safeParse(id);
  const intervencion = analisisDeId.success
    ? await intervencionPorId(comoIntervencionId(analisisDeId.data), contexto)
    : null;

  if (!intervencion) notFound();

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
      titulo={`Intervencion ${tipo}`}
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

      <dl className="flex flex-col gap-4 rounded-md border border-caliza-divisor bg-caliza-superficie p-4">
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
        <Dato etiqueta="Lugar" valor={intervencion.lugarId} />
        <Dato etiqueta="Calle" valor={intervencion.calleId ?? "Sin calle"} />
        <Dato
          etiqueta="Reporte de origen"
          valor={intervencion.reporteId ?? "Sin reporte"}
        />
        <Dato etiqueta="Descripcion" valor={intervencion.descripcion} />
      </dl>

      {puedeAdministrar ? (
        <>
          <Panel titulo="Cambiar estado">
            <AccionesDeIntervencion intervencion={intervencion} />
          </Panel>
          <Panel titulo="Corregir intervencion">
            <FormularioDeCorreccion intervencion={intervencion} />
          </Panel>
        </>
      ) : null}
    </PaginaDePanel>
  );
}
