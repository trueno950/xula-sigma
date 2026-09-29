import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import {
  AccionesDeReporte,
  comoReporteId,
  DetalleDeReporte,
  historialDeReporte,
  reportePorId,
} from "@/modules/reportes";
import { contextoActual } from "@/shared/auth";
import { puedeAdministrarReportes } from "@/shared/auth/roles";
import {
  Aviso,
  AvisoDePermiso,
  CLASES_DE_ETIQUETA,
  Migaja,
  PaginaDePanel,
  Panel,
  PantallaDeMensaje,
} from "@/shared/ui";

export const metadata: Metadata = { title: "Detalle de reporte" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const esquemaDeId = z.string().uuid();
const esquemaDeParametros = z.object({ error: z.string().optional() });

const Dato = ({ etiqueta, valor }: { etiqueta: string; valor: string }) => (
  <div className="flex flex-col gap-1">
    <dt className={CLASES_DE_ETIQUETA}>{etiqueta}</dt>
    <dd className="text-[15px] text-caliza-tinta">{valor}</dd>
  </div>
);

/**
 * Ficha del reporte con su historial y las transiciones (tasks.md 7.12).
 * Mismo criterio que `padron/[id]/page.tsx` para "no existe": RLS ya deja
 * `reportePorId` en `null` para un reporte de otro tenant, y la pantalla
 * responde 404 sin distinguirla de uno inexistente (regla 8).
 *
 * `AccionesDeReporte` solo se monta si `puedeAdministrarReportes`: ocultar
 * el formulario es UX, la guarda real vive en `cambiarEstadoDeReporte`/
 * `asignarAreaDeReporte` (Fase 5, design.md seccion 15).
 *
 * **Vive en `/reportes/detalle/[id]` y no en `/reportes/[id]`** -desvio de
 * tasks.md 7.12, que escribia `{page,alta,[id]}`-: `src/app/reportes/[folio]`
 * (Fase 6, ya en `main`) ya ocupa `/reportes/[*]` como segmento dinamico
 * publico, y Next.js rechaza dos rutas dinamicas distintas en la misma
 * posicion del arbol ("Ambiguous route pattern", verificado con
 * `next build`). `alta` convive porque es un segmento literal, no dinamico.
 */
export default async function PaginaDeDetalleDeReporte({
  params,
  searchParams,
}: Props) {
  const contexto = await contextoActual();

  if (!contexto) {
    return <PantallaDeMensaje mensaje="No se pudo determinar su sesion." />;
  }

  const { id } = await params;
  const analisisDeId = esquemaDeId.safeParse(id);
  const reporte = analisisDeId.success
    ? await reportePorId(comoReporteId(analisisDeId.data), contexto)
    : null;

  if (!reporte) notFound();

  const historial = await historialDeReporte(reporte.id, contexto);
  const analisisDeParametros = esquemaDeParametros.safeParse(
    await searchParams,
  );
  const error = analisisDeParametros.success
    ? analisisDeParametros.data.error
    : undefined;
  const puedeAdministrar = puedeAdministrarReportes(contexto.usuario.rol);

  return (
    <PaginaDePanel
      titulo={reporte.folio}
      ancho="detalle"
      migaja={
        <Migaja
          pasos={[
            { etiqueta: "Reportes", href: "/reportes" },
            { etiqueta: reporte.folio },
          ]}
          etiqueta="Ruta"
        />
      }
    >
      {error ? <Aviso tono="error">{error}</Aviso> : null}

      {!puedeAdministrar ? (
        <AvisoDePermiso
          capacidad="cambiar el estado y asignar el area de un reporte"
          requisito="el rol de administrador municipal"
        />
      ) : null}

      <dl className="flex flex-col gap-4 rounded-md border border-caliza-divisor bg-caliza-superficie p-4">
        <Dato etiqueta="Tipo" valor={reporte.tipo} />
        <Dato etiqueta="Estado" valor={reporte.estado} />
        <Dato
          etiqueta="Area"
          valor={reporte.areaResponsable ?? "Sin asignar"}
        />
        <Dato etiqueta="Descripcion" valor={reporte.descripcion} />
        {reporte.referencia ? (
          <Dato etiqueta="Referencia" valor={reporte.referencia} />
        ) : null}
      </dl>

      {puedeAdministrar ? (
        <Panel titulo="Transiciones">
          <AccionesDeReporte
            reporteId={reporte.id}
            estadoActual={reporte.estado}
          />
        </Panel>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-[15px] font-semibold text-caliza-tinta">
          Historial
        </h2>
        <DetalleDeReporte historial={historial} />
      </section>
    </PaginaDePanel>
  );
}
