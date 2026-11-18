import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { z } from "zod";
import {
  ETIQUETA_DE_TIPO_DE_INTERVENCION,
  ProgramarObra,
  TIPOS_DE_INTERVENCION,
} from "@/modules/intervenciones";
import {
  AccionesDeReporte,
  comoReporteId,
  DetalleDeReporte,
  detalleDeReporte,
  diasDeAtraso,
  esTerminal,
  historialDeReporte,
  leerUmbralDeAtraso,
  PanelDeAcciones,
  type ReporteDeDetalle,
  resumenDeUbicacion,
} from "@/modules/reportes";
import { contextoActual } from "@/shared/auth";
import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeAdministrarReportes } from "@/shared/auth/roles";
import { hoyEnMerida } from "@/shared/lib/fecha";
import {
  Aviso,
  AvisoDePermiso,
  Migaja,
  opcionesEtiquetadas,
  PaginaDePanel,
  PantallaDeMensaje,
} from "@/shared/ui";

export const metadata: Metadata = { title: "Detalle de reporte" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const esquemaDeId = z.string().uuid();
const esquemaDeParametros = z.object({ error: z.string().optional() });

const OPCIONES_DE_OBRA = opcionesEtiquetadas(
  TIPOS_DE_INTERVENCION,
  ETIQUETA_DE_TIPO_DE_INTERVENCION,
);

/** Los dias de atraso con el umbral del municipio: la misma cuenta que la bandeja (S12). */
const atrasoDe = async (
  reporte: ReporteDeDetalle,
  contexto: ContextoActual,
): Promise<number | null> =>
  diasDeAtraso({
    estado: reporte.estado,
    fechaDeRegistro: reporte.fechaDeRegistro,
    hoy: hoyEnMerida(),
    umbral: await leerUmbralDeAtraso(contexto),
  });

/**
 * Lo que va en la columna de acciones: el panel para quien administra un
 * reporte abierto, el aviso de permiso para quien no, y nada para un reporte
 * terminal -no hay transiciones que ofrecer, y la ficha ya lo dice-.
 */
const accionesDe = (
  reporte: ReporteDeDetalle,
  puedeAdministrar: boolean,
): ReactNode => {
  if (!puedeAdministrar) {
    return (
      <AvisoDePermiso
        capacidad="cambiar el estado y asignar el área de un reporte"
        requisito="el rol de administrador municipal"
      />
    );
  }

  if (esTerminal(reporte.estado)) return undefined;

  return (
    <PanelDeAcciones>
      <AccionesDeReporte
        reporteId={reporte.id}
        estadoActual={reporte.estado}
        programarObra={
          <ProgramarObra
            reporteId={reporte.id}
            tipos={OPCIONES_DE_OBRA}
            embebido
          />
        }
      />
    </PanelDeAcciones>
  );
};

/**
 * Ficha del reporte con su historial y las transiciones (tasks.md 7.12).
 * Mismo criterio que `padron/[id]/page.tsx` para "no existe": RLS ya deja la
 * lectura en `null` para un reporte de otro tenant, y la pantalla responde
 * 404 sin distinguirla de uno inexistente (regla 8).
 *
 * La lectura es `detalleDeReporte` y no `reportePorId`: trae la ubicacion y
 * la fecha civil del registro, que son la ficha de S11. Ocultar el panel es
 * UX, la guarda real vive en `cambiarEstadoDeReporte`/`asignarAreaDeReporte`
 * (Fase 5, design.md seccion 15).
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
    ? await detalleDeReporte(comoReporteId(analisisDeId.data), contexto)
    : null;

  if (!reporte) notFound();

  const analisisDeParametros = esquemaDeParametros.safeParse(
    await searchParams,
  );
  const error = analisisDeParametros.success
    ? analisisDeParametros.data.error
    : undefined;
  const [historial, atraso] = await Promise.all([
    historialDeReporte(reporte.id, contexto),
    atrasoDe(reporte, contexto),
  ]);
  const puedeAdministrar = puedeAdministrarReportes(contexto.usuario.rol);

  return (
    <PaginaDePanel
      titulo={reporte.folio}
      descripcion={resumenDeUbicacion(reporte)}
      ancho="detalleAmplio"
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

      <DetalleDeReporte
        reporte={reporte}
        historial={historial}
        atraso={atraso}
        acciones={accionesDe(reporte, puedeAdministrar)}
      />
    </PaginaDePanel>
  );
}
