import Link from "next/link";
import { z } from "zod";
import {
  BuscadorDePersonas,
  buscarPersonas,
  ListadoDePersonas,
  listarPersonas,
} from "@/modules/padron";
import { contextoActual } from "@/shared/auth";
import { puedeEscribir } from "@/shared/auth/roles";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * `?q=a&q=b` llega como `string[]`, no `string` — Next no lo impide. Sin
 * este `safeParse`, ese caso pasaba `string[]` a `buscarPersonas(cadena:
 * string, ...)`, que termina en `texto.normalize()` dentro de
 * `normalizarParaBusqueda` y revienta con un 500 sobre una URL publica.
 */
const esquemaDeBusqueda = z.object({ q: z.string().trim().min(1).optional() });

/**
 * Ruta fina: resuelve el contexto, lista o busca, y compone. Por que la
 * lectura no tiene guarda de rol: `listarPersonas.ts`. El enlace a
 * `/padron/alta` si la tiene -mismo `puedeEscribir` que esa ruta exige de
 * nuevo del lado del caso de uso-: sin esto, el rol de solo lectura llegaba
 * a un formulario que igual lo iba a rechazar, un callejon sin salida.
 *
 * `?q=` y no un Server Action: `BuscadorDePersonas.tsx` explica por que.
 */
export default async function PaginaDePadron({ searchParams }: Props) {
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

  const analisis = esquemaDeBusqueda.safeParse(await searchParams);
  const q = analisis.success ? analisis.data.q : undefined;
  const personas = q
    ? await buscarPersonas(q, contexto)
    : await listarPersonas(contexto);

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-caliza-tinta">
          Padron de personas
        </h1>
        {puedeEscribir(contexto.usuario.rol) ? (
          <Link
            href="/padron/alta"
            className="flex h-11 items-center rounded-sm bg-marca px-4 text-[15px] font-medium text-marca-texto"
          >
            Nueva persona
          </Link>
        ) : null}
      </div>
      <BuscadorDePersonas {...(q ? { cadena: q } : {})} />
      <ListadoDePersonas personas={personas} />
    </main>
  );
}
