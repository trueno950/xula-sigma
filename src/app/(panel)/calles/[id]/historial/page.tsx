import { ArrowLeft } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  type CalleId,
  comoCalleId,
  LineaDeTiempoDeCalle,
  leerHistorialDeCalle,
} from "@/modules/historial-de-calle";
import {
  callePorId,
  comoCalleId as comoCalleIdDeTerritorio,
  listarLugares,
} from "@/modules/territorio";
import { contextoActual } from "@/shared/auth";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError } from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import {
  EnlaceDeAccion,
  Migaja,
  PaginaDePanel,
  PantallaDeMensaje,
} from "@/shared/ui";
import { contextoDeCalle } from "./contextoDeCalle";

export const metadata: Metadata = { title: "Historial de calle" };

/**
 * Los lugares solo arman la migaja: si su lectura falla la pagina sale con
 * la migaja de respaldo hacia Territorio. Un `NoAutorizadoError` se relanza
 * (ver `errores.ts`); la calle y el historial, que son el contenido, no pasan
 * por aqui y siguen propagando.
 */
const lugaresDeLaMigaja = async (contexto: ContextoActual) => {
  try {
    return await listarLugares(contexto);
  } catch (error) {
    if (error instanceof NoAutorizadoError) throw error;
    console.error(
      "[historial-de-calle] no se pudo armar la migaja",
      datosSegurosDeError(error),
    );

    return [];
  }
};

type Props = { params: Promise<{ id: string }> };

export default async function PaginaDeHistorialDeCalle({ params }: Props) {
  const contexto = await contextoActual();
  if (!contexto)
    return <PantallaDeMensaje mensaje="No se pudo determinar su sesión." />;

  const { id } = await params;
  let calleId: CalleId;
  try {
    calleId = comoCalleId(id);
  } catch {
    notFound();
  }

  const historial = await leerHistorialDeCalle(calleId, contexto);
  if (!historial) notFound();

  const [calle, lugares] = await Promise.all([
    callePorId(comoCalleIdDeTerritorio(calleId), contexto),
    lugaresDeLaMigaja(contexto),
  ]);
  if (!calle) notFound();
  const { migaja, volverHref, volverEtiqueta } = contextoDeCalle(
    calle,
    lugares,
  );

  return (
    <PaginaDePanel
      titulo={calle.nombre}
      descripcion="Historial de la calle: sus reportes, intervenciones y cambios, del más reciente al más antiguo."
      ancho="detalle"
      migaja={<Migaja pasos={migaja} etiqueta="Ruta" />}
      accion={
        <EnlaceDeAccion href={volverHref} variante="secundaria">
          <ArrowLeft size={16} weight="bold" aria-hidden="true" />
          {volverEtiqueta}
        </EnlaceDeAccion>
      }
    >
      <LineaDeTiempoDeCalle historial={historial} />
    </PaginaDePanel>
  );
}
