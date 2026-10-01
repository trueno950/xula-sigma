import { Plus } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import { z } from "zod";
import {
  BuscadorDePersonas,
  buscarPersonas,
  ListadoDePersonas,
  listarPersonas,
  TAMANO_DE_PAGINA,
} from "@/modules/padron";
import { contextoActual } from "@/shared/auth";
import { puedeEscribir } from "@/shared/auth/roles";
import {
  AvisoDePermiso,
  EnlaceDeAccion,
  PaginaDePanel,
  PantallaDeMensaje,
} from "@/shared/ui";

export const metadata: Metadata = { title: "Padrón" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * `?q=a&q=b` llega como `string[]`, no `string` — Next no lo impide. Sin
 * este `safeParse`, ese caso pasaba `string[]` a `buscarPersonas(cadena:
 * string, ...)`, que termina en `texto.normalize()` dentro de
 * `normalizarParaBusqueda` y revienta con un 500 sobre una URL publica.
 *
 * `limite`/`ordenar`/`direccion` son `?limite=` ("Ver mas") y
 * `?ordenar=&direccion=` (encabezado clicable) de `design.md`. Un `limite`
 * fuera de rango o un `ordenar` que no sea una columna real invalida el
 * objeto entero -mismo criterio que `q`- y la pantalla cae a los defaults
 * en vez de un 500.
 */
const esquemaDeBusqueda = z.object({
  q: z.string().trim().min(1).optional(),
  limite: z.coerce
    .number()
    .int()
    .positive()
    .max(TAMANO_DE_PAGINA * 40)
    .optional(),
  ordenar: z.enum(["persona"]).optional(),
  direccion: z.enum(["asc", "desc"]).optional(),
});

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
  const limite = analisis.success ? analisis.data.limite : undefined;
  const ordenar = analisis.success ? analisis.data.ordenar : undefined;
  const orden = ordenar
    ? {
        campo: ordenar,
        direccion: (analisis.success && analisis.data.direccion) || "asc",
      }
    : undefined;
  const opciones = {
    ...(limite ? { limite } : {}),
    ...(orden ? { orden } : {}),
  };

  const { personas, hayMas } = q
    ? await buscarPersonas(q, contexto, opciones)
    : await listarPersonas(contexto, opciones);

  const alta = puedeEscribir(contexto.usuario.rol) ? (
    <EnlaceDeAccion href="/padron/alta" variante="primaria">
      <Plus size={18} weight="bold" aria-hidden="true" />
      Nueva persona
    </EnlaceDeAccion>
  ) : undefined;
  const puedeActuar = puedeEscribir(contexto.usuario.rol);

  return (
    <PaginaDePanel titulo="Padron de personas" accion={alta}>
      {!puedeActuar ? (
        <AvisoDePermiso
          capacidad="dar de alta personas en el padron"
          requisito="un rol con permisos de escritura"
        />
      ) : null}
      <BuscadorDePersonas {...(q ? { cadena: q } : {})} />
      <ListadoDePersonas
        personas={personas}
        filtro={q}
        accionDeAlta={alta}
        orden={orden}
        limite={limite}
        hayMas={hayMas}
      />
    </PaginaDePanel>
  );
}
