import { Plus } from "@phosphor-icons/react/ssr";
import { z } from "zod";
import {
  BuscadorDePersonas,
  buscarPersonas,
  ListadoDePersonas,
  listarPersonas,
} from "@/modules/padron";
import { contextoActual } from "@/shared/auth";
import { puedeEscribir } from "@/shared/auth/roles";
import { EnlaceDeAccion, PaginaDePanel, PantallaDeMensaje } from "@/shared/ui";

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
 *
 * El mismo enlace se le pasa dos veces a la pantalla —arriba y como accion
 * del vacio inicial— a proposito: en una lista con filas, la accion vive en
 * la cabecera; en una pantalla vacia, tiene que estar donde el operador
 * esta mirando, que es el centro.
 */
export default async function PaginaDePadron({ searchParams }: Props) {
  const contexto = await contextoActual();

  if (!contexto) {
    return <PantallaDeMensaje mensaje="No se pudo determinar su sesion." />;
  }

  const analisis = esquemaDeBusqueda.safeParse(await searchParams);
  const q = analisis.success ? analisis.data.q : undefined;
  const personas = q
    ? await buscarPersonas(q, contexto)
    : await listarPersonas(contexto);

  const alta = puedeEscribir(contexto.usuario.rol) ? (
    <EnlaceDeAccion href="/padron/alta" variante="primaria">
      <Plus size={18} weight="bold" aria-hidden="true" />
      Nueva persona
    </EnlaceDeAccion>
  ) : undefined;

  return (
    <PaginaDePanel titulo="Padron de personas" accion={alta}>
      <BuscadorDePersonas {...(q ? { cadena: q } : {})} />
      <ListadoDePersonas personas={personas} filtro={q} accionDeAlta={alta} />
    </PaginaDePanel>
  );
}
