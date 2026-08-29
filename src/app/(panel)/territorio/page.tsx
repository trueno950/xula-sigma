import { z } from "zod";
import {
  ArbolDeLugares,
  comoLugarId,
  FormularioDeAltaDeCalle,
  FormularioDeAltaDeLugar,
  FormularioDeBajaDeLugar,
  FormularioDeDomicilio,
  FormularioDeEdicionDeLugar,
  FormularioDeRenombreDeCalle,
  FormularioDeReparenteo,
  listarCalles,
  lugarPorId,
  subarbol,
} from "@/modules/territorio";
import { contextoActual } from "@/shared/auth";
import { puedeAdministrarTerritorio, puedeEscribir } from "@/shared/auth/roles";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const esquemaDeParametros = z.object({
  raiz: z.string().uuid().optional(),
  error: z.string().optional(),
});

/**
 * Ruta fina, mismo reparto que `/padron`: resuelve el contexto, lee la
 * raiz de `?raiz=` (sin listado de lugares todavia — `RepositorioDeLugares`
 * no lo expone, tasks.md Fase 3 no lo pide) y compone.
 */
export default async function PaginaDeTerritorio({ searchParams }: Props) {
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
  const raizId = analisis.success ? analisis.data.raiz : undefined;
  const error = analisis.success ? analisis.data.error : undefined;

  const raiz = raizId ? await lugarPorId(comoLugarId(raizId), contexto) : null;
  const nodos = raiz ? await subarbol(raiz.id, contexto) : [];
  const calles = raiz ? await listarCalles(raiz.id, contexto) : [];

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold text-caliza-tinta">Territorio</h1>

      {error ? (
        <p role="alert" className="text-[15px] text-senial-error">
          {error}
        </p>
      ) : null}

      {raiz ? (
        <ArbolDeLugares raiz={raiz} nodos={nodos} />
      ) : (
        <p className="text-[15px] text-caliza-apagada">
          Sin raiz seleccionada. Agregue{" "}
          <code>?raiz=&lt;id-de-un-lugar&gt;</code> a la URL para ver su arbol.
        </p>
      )}

      {puedeEscribir(contexto.usuario.rol) ? (
        <div className="flex flex-col gap-6 border-t border-caliza-divisor pt-4">
          <FormularioDeAltaDeLugar />
          <FormularioDeEdicionDeLugar />
          <FormularioDeBajaDeLugar />
          {raiz ? (
            <FormularioDeDomicilio lugarId={raiz.id} calles={calles} />
          ) : null}
        </div>
      ) : null}

      {puedeAdministrarTerritorio(contexto.usuario.rol) ? (
        <div className="flex flex-col gap-6 border-t border-caliza-divisor pt-4">
          <FormularioDeReparenteo />
          {raiz ? (
            <>
              <FormularioDeAltaDeCalle lugarId={raiz.id} />
              <FormularioDeRenombreDeCalle calles={calles} />
            </>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
