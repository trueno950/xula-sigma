import { Plus } from "@phosphor-icons/react/ssr";
import { z } from "zod";
import {
  ESTADOS_DE_REPORTE,
  type FiltrosDeListado,
  ListadoDeReportes,
  listarReportes,
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

const esquemaDeParametros = z.object({
  estado: z.enum(ESTADOS_DE_REPORTE).optional(),
  tipo: z.enum(TIPOS_DE_INCIDENCIA).optional(),
  error: z.string().optional(),
});

/**
 * Ruta fina: resuelve el contexto, filtra y compone (tasks.md 7.12). Sin
 * guarda de rol propia -leer no es escribir, `listarReportes.ts`-; el
 * enlace de alta si exige `puedeEscribir`, mismo criterio que
 * `PaginaDePadron`: sin el, el rol de solo lectura llegaria a un
 * formulario que el caso de uso igual rechaza.
 */
export default async function PaginaDeReportes({ searchParams }: Props) {
  const contexto = await contextoActual();

  if (!contexto) {
    return <PantallaDeMensaje mensaje="No se pudo determinar su sesion." />;
  }

  const analisis = esquemaDeParametros.safeParse(await searchParams);
  const filtros: FiltrosDeListado = {
    ...(analisis.success && analisis.data.estado
      ? { estado: analisis.data.estado }
      : {}),
    ...(analisis.success && analisis.data.tipo
      ? { tipo: analisis.data.tipo }
      : {}),
  };
  const error = analisis.success ? analisis.data.error : undefined;

  const reportes = await listarReportes(filtros, contexto);
  const estado = estadoDeLista({
    total: reportes.length,
    filtro: filtros.estado ?? filtros.tipo,
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
        estadoDeLista={estado}
        filtros={filtros}
        rol={contexto.usuario.rol}
      />
    </PaginaDePanel>
  );
}
