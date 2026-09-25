import { notFound } from "next/navigation";
import {
  type CalleId,
  comoCalleId,
  LineaDeTiempoDeCalle,
  leerHistorialDeCalle,
} from "@/modules/historial-de-calle";
import { contextoActual } from "@/shared/auth";
import { Migaja, PaginaDePanel, PantallaDeMensaje } from "@/shared/ui";

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

  return (
    <PaginaDePanel
      titulo="Historial de calle"
      ancho="detalle"
      migaja={
        <Migaja
          pasos={[
            { etiqueta: "Territorio", href: "/territorio" },
            { etiqueta: "Historial de calle" },
          ]}
          etiqueta="Ruta"
        />
      }
    >
      <LineaDeTiempoDeCalle historial={historial} />
    </PaginaDePanel>
  );
}
