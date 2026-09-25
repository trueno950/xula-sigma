import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { validarFolio } from "@/modules/constancias";
import { limitarRitmo } from "@/shared/auth/limitarRitmo";
import { fechaYHoraEnMerida } from "@/shared/lib/fecha";
import {
  exigirAyuntamiento,
  superficieActual,
} from "@/shared/tenancy/contexto";

export const metadata: Metadata = { title: "Validar constancia" };

type Props = {
  params: Promise<{ folio: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * `Awaited<ReturnType<typeof validarFolio>>` y no un import directo de
 * `ResultadoDeValidacion` desde `domain`: `app-no-importa-infrastructure`
 * (`.dependency-cruiser.cjs`) prohibe que `src/app` importe el interior de
 * `domain` de cualquier modulo. El barrel de `constancias` no reexporta ese
 * tipo -solo `comoConstanciaId`, `superficiePublica.test.ts`-, y esta es la
 * unica forma de nombrarlo sin esa arista prohibida.
 */
type ResultadoDeValidacion = Awaited<ReturnType<typeof validarFolio>>;

/** Precedente exacto: `api/auth/[...all]/route.ts:22-23`. */
const ipDe = (cabeceras: Headers) =>
  cabeceras.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "sin-ip";

const tieneTitular = (
  resultado: ResultadoDeValidacion,
): resultado is Extract<ResultadoDeValidacion, { titular: string }> =>
  "titular" in resultado;

/**
 * Validacion publica de folio (design.md de `constancias-oficios`, seccion
 * 13). Sin sesion: es la primera pantalla del repo que lee un visitante
 * anonimo. `CABECERA_SUPERFICIE` y `notFound()` corren primero -mismo
 * criterio que `pdf/route.ts`: los layouts no envuelven todo lo que cuelga
 * de `src/app/`, y sin la guarda `ayuntamientoActual()` intentaria resolver
 * un tenant inexistente en la superficie `raiz`.
 *
 * HTTP 200 siempre para los cuatro caminos negativos de
 * `proyectarValidacion` -un 404 reconstruiria el oraculo que esa union
 * cerrada existe para cerrar (design.md seccion 8)-.
 */
export default async function PaginaDeValidacion({
  params,
  searchParams,
}: Props) {
  const cabeceras = await headers();
  if ((await superficieActual()) !== "ayuntamiento") notFound();

  const { id: ayuntamientoId } = await exigirAyuntamiento();
  const { folio } = await params;
  const parametros = await searchParams;
  const c = parametros.c;
  const codigo = typeof c === "string" ? c : null;

  // El limitador corre ANTES del caso de uso, con la IP como unica clave
  // (design.md seccion 12): con el folio como clave, cada numero de la
  // serie estrenaria su propia ventana y recorrerla saldria gratis.
  await limitarRitmo(ayuntamientoId, [
    { tipo: "folio", valor: ipDe(cabeceras) },
  ]);

  const resultado = await validarFolio({ ayuntamientoId, folio, codigo });

  return <VistaDeResultado resultado={resultado} folio={folio} />;
}

function VistaDeResultado({
  resultado,
  folio,
}: {
  resultado: ResultadoDeValidacion;
  folio: string;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold text-caliza-tinta">{folio}</h1>

      {resultado.estado === "NO_VALIDO" ? (
        <p className="text-[15px] text-senial-error">
          Este folio no es un documento válido.
        </p>
      ) : (
        <>
          <p className="text-[15px] text-caliza-tinta">Documento vigente.</p>
          <dl className="flex flex-col gap-3">
            <div>
              <dt className="text-[13px] font-medium text-caliza-apagada">
                Emitida
              </dt>
              <dd className="text-[15px] text-caliza-tinta">
                {fechaYHoraEnMerida(new Date(resultado.emitidaEn))}
              </dd>
            </div>
            {tieneTitular(resultado) ? (
              <>
                <div>
                  <dt className="text-[13px] font-medium text-caliza-apagada">
                    Titular
                  </dt>
                  <dd className="text-[15px] text-caliza-tinta">
                    {resultado.titular}
                  </dd>
                </div>
                <div>
                  <dt className="text-[13px] font-medium text-caliza-apagada">
                    Dirección
                  </dt>
                  <dd className="text-[15px] text-caliza-tinta">
                    {resultado.direccion}
                  </dd>
                </div>
              </>
            ) : null}
          </dl>
        </>
      )}
    </main>
  );
}
