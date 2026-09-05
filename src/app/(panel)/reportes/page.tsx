import { Plus } from "@phosphor-icons/react/ssr";
import { z } from "zod";
import {
  buscarReportes,
  ESTADOS_DE_REPORTE,
  type FiltrosDeListado,
  ListadoDeReportes,
  listarReportes,
  TAMANO_DE_PAGINA,
  TIPOS_DE_INCIDENCIA,
} from "@/modules/reportes";
import { contextoActual } from "@/shared/auth";
import { puedeEscribir } from "@/shared/auth/roles";
import {
  Aviso,
  EnlaceDeAccion,
  estadoDeLista,
  PaginaDePanel,
  PantallaDeMensaje,
} from "@/shared/ui";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * `?estado=a&estado=b` llega como `string[]`, no `string` -mismo caso que
 * documenta `app/(panel)/padron/page.tsx`. Sin este `safeParse`, ese caso
 * invalidaria un `z.enum` con un 500 en vez de caer a los defaults.
 * `limite`/`ordenar`/`direccion` son `?limite=` ("Ver mas") y
 * `?ordenar=&direccion=` (encabezado clicable) de `design.md`.
 */
const esquemaDeParametros = z.object({
  estado: z.enum(ESTADOS_DE_REPORTE).optional(),
  tipo: z.enum(TIPOS_DE_INCIDENCIA).optional(),
  q: z.string().trim().min(1).optional(),
  limite: z.coerce
    .number()
    .int()
    .positive()
    .max(TAMANO_DE_PAGINA * 40)
    .optional(),
  ordenar: z.enum(["folio", "registrado"]).optional(),
  direccion: z.enum(["asc", "desc"]).optional(),
  error: z.string().optional(),
});

/**
 * Separada de la funcion de pagina para que `PaginaDeReportes` no repita el
 * `analisis.success ? ... : undefined` de cada campo -eso era lo que le
 * costaba la complejidad ciclomatica a una sola funcion (Biome,
 * `noExcessiveCognitiveComplexity`). Devuelve los defaults directo cuando
 * el `safeParse` fallo -mismo criterio que `PaginaDePadron`.
 */
function resolverParametros(
  analisis: ReturnType<typeof esquemaDeParametros.safeParse>,
) {
  if (!analisis.success) {
    return {
      filtros: {} as FiltrosDeListado,
      q: undefined,
      limite: undefined,
      orden: undefined,
      error: undefined,
    };
  }

  const { estado, tipo, q, limite, ordenar, direccion, error } = analisis.data;
  const filtros: FiltrosDeListado = {
    ...(estado ? { estado } : {}),
    ...(tipo ? { tipo } : {}),
  };
  const orden = ordenar
    ? { campo: ordenar, direccion: direccion || "asc" }
    : undefined;

  return { filtros, q, limite, orden, error };
}

/**
 * Ruta fina: resuelve el contexto, busca o lista, y compone (tasks.md
 * 7.12). Sin guarda de rol propia -leer no es escribir, `listarReportes.ts`-;
 * el enlace de alta si exige `puedeEscribir`, mismo criterio que
 * `PaginaDePadron`: sin el, el rol de solo lectura llegaria a un
 * formulario que el caso de uso igual rechaza.
 *
 * `q` decide entre `buscarReportes` y `listarReportes` -mismo patron que
 * `PaginaDePadron`-, pero a diferencia de esa pantalla los filtros de
 * `estado`/`tipo` viajan en los dos casos: `design.md`, "Buscador",
 * "convive con los filtros, nunca los reemplaza".
 */
export default async function PaginaDeReportes({ searchParams }: Props) {
  const contexto = await contextoActual();

  if (!contexto) {
    return <PantallaDeMensaje mensaje="No se pudo determinar su sesion." />;
  }

  const analisis = esquemaDeParametros.safeParse(await searchParams);
  const { filtros, q, limite, orden, error } = resolverParametros(analisis);

  const opciones = {
    ...(limite ? { limite } : {}),
    ...(orden ? { orden } : {}),
  };
  const { reportes, hayMas } = q
    ? await buscarReportes(q, contexto, { filtros, ...opciones })
    : await listarReportes(filtros, contexto, opciones);
  const estado = estadoDeLista({
    total: reportes.length,
    filtro: q ?? filtros.estado ?? filtros.tipo,
  });

  const alta = puedeEscribir(contexto.usuario.rol) ? (
    <EnlaceDeAccion href="/reportes/alta" variante="primaria">
      <Plus size={18} weight="bold" aria-hidden="true" />
      Registrar reporte
    </EnlaceDeAccion>
  ) : undefined;

  return (
    <PaginaDePanel titulo="Reportes ciudadanos" accion={alta}>
      {error ? <Aviso tono="error">{error}</Aviso> : null}

      <ListadoDeReportes
        reportes={reportes}
        hayMas={hayMas}
        estadoDeLista={estado}
        filtros={filtros}
        q={q}
        orden={orden}
        limite={limite}
        rol={contexto.usuario.rol}
      />
    </PaginaDePanel>
  );
}
