import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import {
  AccionesDeReporte,
  comoReporteId,
  DetalleDeReporte,
  ETIQUETA_DE_AREA,
  ETIQUETA_DE_ESTADO_DE_REPORTE,
  ETIQUETA_DE_TIPO_DE_INCIDENCIA,
  esTerminal,
  historialDeReporte,
  reportePorId,
  SIN_AREA,
} from "@/modules/reportes";
import { contextoActual } from "@/shared/auth";
import { puedeAdministrarReportes } from "@/shared/auth/roles";
import {
  Aviso,
  AvisoDePermiso,
  FichaDeDatos,
  FilaDeFicha,
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

/**
 * Ficha del reporte con su historial y las transiciones (tasks.md 7.12).
 * Mismo criterio que `padron/[id]/page.tsx` para "no existe": RLS ya deja
 * `reportePorId` en `null` para un reporte de otro tenant, y la pantalla
 * responde 404 sin distinguirla de uno inexistente (regla 8).
 *
 * `AccionesDeReporte` solo se monta si `puedeAdministrarReportes` y el
 * estado no es terminal: ocultar el formulario es UX, la guarda real vive
 * en `cambiarEstadoDeReporte`/`asignarAreaDeReporte` (Fase 5, design.md
 * seccion 15). En `RESUELTO`/`RECHAZADO` no hay transiciones validas que
 * ofrecer, y montarlo dejaba la tarjeta sin contenido.
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
    return <PantallaDeMensaje mensaje="No se pudo determinar su sesión." />;
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
          capacidad="cambiar el estado y asignar el área de un reporte"
          requisito="el rol de administrador municipal"
        />
      ) : null}

      <FichaDeDatos>
        <FilaDeFicha etiqueta="Tipo">
          {ETIQUETA_DE_TIPO_DE_INCIDENCIA[reporte.tipo]}
        </FilaDeFicha>
        <FilaDeFicha etiqueta="Estado">
          {ETIQUETA_DE_ESTADO_DE_REPORTE[reporte.estado]}
        </FilaDeFicha>
        <FilaDeFicha etiqueta="Área">
          {reporte.areaResponsable
            ? ETIQUETA_DE_AREA[reporte.areaResponsable]
            : SIN_AREA}
        </FilaDeFicha>
        <FilaDeFicha etiqueta="Descripción">{reporte.descripcion}</FilaDeFicha>
        {reporte.referencia ? (
          <FilaDeFicha etiqueta="Referencia">{reporte.referencia}</FilaDeFicha>
        ) : null}
      </FichaDeDatos>

      {puedeAdministrar && !esTerminal(reporte.estado) ? (
        <Panel titulo="Transiciones">
          <AccionesDeReporte
            reporteId={reporte.id}
            estadoActual={reporte.estado}
          />
        </Panel>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-[1.25rem] leading-[1.3] font-semibold tracking-[-0.01em] text-caliza-tinta">
          Historial
        </h2>
        <DetalleDeReporte historial={historial} />
      </section>
    </PaginaDePanel>
  );
}
