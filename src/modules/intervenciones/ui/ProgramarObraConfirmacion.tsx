import Link from "next/link";
import { Aviso, CLASES_DE_ENLACE } from "@/shared/ui";
import type { ObraDeReporte } from "../application/obrasDeReporte";

/**
 * La confirmacion de S16 (P1) en el detalle del reporte: el aviso y el
 * enlace «Ver la obra» que faltaban cuando programar obra recargaba la misma
 * pantalla sin decir que habia pasado.
 *
 * Recibe la obra entera y no un id suelto a proposito: quien la usa la
 * cruzo antes contra las obras que leyo bajo RLS para este reporte, asi que
 * un `?obra=` inventado o de otro municipio no llega hasta aca y no produce
 * un enlace que responderia 404.
 */
export function ProgramarObraConfirmacion({ obra }: { obra: ObraDeReporte }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <Aviso tono="exito">La obra quedó programada.</Aviso>
      <Link
        href={`/intervenciones/${obra.id}`}
        className={`rounded-sm ${CLASES_DE_ENLACE}`}
      >
        Ver la obra
      </Link>
    </div>
  );
}
