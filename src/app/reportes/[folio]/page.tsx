import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  consultarFolioDeReporte,
  ETIQUETA_DE_ESTADO_DE_REPORTE,
  ETIQUETA_DE_TIPO_DE_INCIDENCIA,
} from "@/modules/reportes";
import { limitarRitmo } from "@/shared/auth/limitarRitmo";
import { fechaYHoraEnMerida } from "@/shared/lib/fecha";
import {
  exigirAyuntamiento,
  superficieActual,
} from "@/shared/tenancy/contexto";

export const metadata: Metadata = { title: "Seguimiento de reporte" };

type Props = {
  params: Promise<{ folio: string }>;
};

/**
 * `Awaited<ReturnType<typeof consultarFolioDeReporte>>` y no un import
 * directo de `ConsultaDeReporte` desde `domain`: `app-no-importa-infrastructure`
 * (`.dependency-cruiser.cjs`) prohibe que `src/app` importe el interior de
 * `domain` de cualquier modulo. Mismo patron que
 * `src/app/validar/[folio]/page.tsx:17-24`.
 */
type ResultadoDeConsulta = Awaited<ReturnType<typeof consultarFolioDeReporte>>;

/** Precedente exacto: `api/auth/[...all]/route.ts:22-23`. */
const ipDe = (cabeceras: Headers) =>
  cabeceras.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "sin-ip";

/**
 * Consulta publica de folio (design.md de `reportes-ciudadanos`, seccion
 * 14). Sin sesion, calco de `src/app/validar/[folio]/page.tsx`:
 * `CABECERA_SUPERFICIE` y `notFound()` corren primero, antes de resolver un
 * tenant que no existe en la superficie `raiz`.
 *
 * HTTP 200 siempre para el resultado `SIN_REGISTRO` -folio inexistente, de
 * otro municipio o mal escrito son, los tres, el mismo `SIN_REGISTRO`
 * indistinguible (design.md seccion 14); el mal escrito ni siquiera toca la
 * base, lo corta `esquemaDeFolio` dentro de `consultarFolioDeReporte`-. Un
 * 404 reconstruiria el oraculo que esa union cerrada existe para cerrar.
 */
export default async function PaginaDeConsultaDeReporte({ params }: Props) {
  const cabeceras = await headers();
  if ((await superficieActual()) !== "ayuntamiento") notFound();

  const { id: ayuntamientoId } = await exigirAyuntamiento();
  const { folio } = await params;

  // El limitador corre ANTES del caso de uso, con la IP como unica clave
  // (design.md seccion 14): con el folio como clave, recorrer la serie
  // consecutiva saldria gratis.
  await limitarRitmo(ayuntamientoId, [
    { tipo: "folio", valor: ipDe(cabeceras) },
  ]);

  const resultado = await consultarFolioDeReporte({ ayuntamientoId, folio });

  return <VistaDeResultado resultado={resultado} folio={folio} />;
}

function VistaDeResultado({
  resultado,
  folio,
}: {
  resultado: ResultadoDeConsulta;
  folio: string;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold text-caliza-tinta">{folio}</h1>

      {resultado.resultado === "SIN_REGISTRO" ? (
        <p className="text-[15px] text-senial-error">
          No hay ningun reporte registrado con este folio.
        </p>
      ) : (
        <dl className="flex flex-col gap-3">
          <div>
            <dt className="text-[13px] font-medium text-caliza-apagada">
              Tipo
            </dt>
            <dd className="text-[15px] text-caliza-tinta">
              {ETIQUETA_DE_TIPO_DE_INCIDENCIA[resultado.tipo]}
            </dd>
          </div>
          <div>
            <dt className="text-[13px] font-medium text-caliza-apagada">
              Estado
            </dt>
            <dd className="text-[15px] text-caliza-tinta">
              {ETIQUETA_DE_ESTADO_DE_REPORTE[resultado.estado]}
            </dd>
          </div>
          <div>
            <dt className="text-[13px] font-medium text-caliza-apagada">
              Registrado
            </dt>
            <dd className="text-[15px] text-caliza-tinta">
              {fechaYHoraEnMerida(new Date(resultado.registradoEn))}
            </dd>
          </div>
          <div>
            <dt className="text-[13px] font-medium text-caliza-apagada">
              Ultimo movimiento
            </dt>
            <dd className="text-[15px] text-caliza-tinta">
              {fechaYHoraEnMerida(new Date(resultado.actualizadoEn))}
            </dd>
          </div>
        </dl>
      )}
    </main>
  );
}
