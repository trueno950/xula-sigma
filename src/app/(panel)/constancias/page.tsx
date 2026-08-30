import Link from "next/link";
import { listarConstancias } from "@/modules/constancias";
import { contextoActual } from "@/shared/auth";

/**
 * Ruta fina: resuelve el contexto y lista. Sin `?q=` -`listarConstancias`
 * todavia no tiene busqueda- ni enlace generico "Emitir constancia": la
 * emision necesita un `personaId` en mano (`emitirConstancia`), y la unica
 * pantalla del repo que ya lo tiene es `/padron/[id]`, que enlaza aca.
 */
export default async function PaginaDeConstancias() {
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

  const constancias = await listarConstancias(contexto);

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold text-caliza-tinta">Constancias</h1>

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
                  {constancia.emitidaEn.toLocaleDateString("es-MX")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
