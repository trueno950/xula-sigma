import Link from "next/link";
import { ListadoDePersonas, listarPersonas } from "@/modules/padron";
import { contextoActual } from "@/shared/auth";
import { puedeEscribir } from "@/shared/auth/roles";

/**
 * Ruta fina: resuelve el contexto, lista y compone. Por que la lectura no
 * tiene guarda de rol: `listarPersonas.ts`. El enlace a `/padron/alta` si
 * la tiene -mismo `puedeEscribir` que esa ruta exige de nuevo del lado del
 * caso de uso-: sin esto, el rol de solo lectura llegaba a un formulario
 * que igual lo iba a rechazar, un callejon sin salida.
 */
export default async function PaginaDePadron() {
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

  const personas = await listarPersonas(contexto);

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
      <ListadoDePersonas personas={personas} />
    </main>
  );
}
