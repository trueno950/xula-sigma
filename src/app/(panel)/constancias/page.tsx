import Link from "next/link";
import { z } from "zod";
import { listarConstancias } from "@/modules/constancias";
import { contextoActual } from "@/shared/auth";
import { fechaEnMerida } from "@/shared/lib/fecha";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const esquemaDeParametros = z.object({ error: z.string().optional() });

/**
 * Ruta fina: resuelve el contexto y lista. Sin `?q=` -`listarConstancias`
 * todavia no tiene busqueda- ni enlace generico "Emitir constancia": por
 * que la emision no vive aca, ver el comentario de cabecera de
 * `constancias/emitir/page.tsx`. Lee `?error=` porque
 * `emitirConstanciaAction` redirige aca con un mensaje redactado cuando el
 * formulario llega invalido -sin este `searchParams`, ese mensaje se perdia
 * en silencio (hallazgo de GGA en la revision de esta rebanada, mismo
 * patron ya usado en `configuracion/page.tsx`).
 */
export default async function PaginaDeConstancias({ searchParams }: Props) {
  const contexto = await contextoActual();

  if (!contexto) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 p-6">
        <p className="text-[15px] text-caliza-apagada">
          No se pudo determinar su sesion.
        </p>
      </main>
    );
  }

  const analisis = esquemaDeParametros.safeParse(await searchParams);
  const error = analisis.success ? analisis.data.error : undefined;
  const constancias = await listarConstancias(contexto);

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold text-caliza-tinta">Constancias</h1>

      {error ? (
        <p role="alert" className="text-[15px] text-senial-error">
          {error}
        </p>
      ) : null}

      {constancias.length === 0 ? (
        <p className="text-[15px] text-caliza-apagada">
          Todavia no hay constancias emitidas.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {constancias.map((constancia) => (
            <li key={constancia.id}>
              <Link
                href={`/constancias/${constancia.id}`}
                className="flex items-center justify-between rounded-sm border border-caliza-borde px-3 py-2"
              >
                <span className="text-[15px] text-caliza-tinta">
                  {constancia.folio}
                </span>
                <span className="text-[13px] text-caliza-apagada">
                  {fechaEnMerida(constancia.emitidaEn)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
