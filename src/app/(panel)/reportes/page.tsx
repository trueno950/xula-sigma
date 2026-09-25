import { Plus } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import {
  buscarReportes,
  ListadoDeReportes,
  listarReportes,
} from "@/modules/reportes";
import { contextoActual } from "@/shared/auth";
import { puedeEscribir } from "@/shared/auth/roles";
import {
  Aviso,
  AvisoDePermiso,
  EnlaceDeAccion,
  estadoDeLista,
  PaginaDePanel,
  PantallaDeMensaje,
} from "@/shared/ui";
import { leerParametros } from "./parametros";

export const metadata: Metadata = { title: "Reportes" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

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

  const { filtros, q, limite, orden, error } = leerParametros(
    await searchParams,
  );

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
  const puedeActuar = puedeEscribir(contexto.usuario.rol);

  return (
    <PaginaDePanel titulo="Reportes ciudadanos" accion={alta}>
      {error ? <Aviso tono="error">{error}</Aviso> : null}

      {!puedeActuar ? (
        <AvisoDePermiso
          capacidad="registrar reportes ciudadanos"
          requisito="un rol con permisos de escritura"
        />
      ) : null}

      <ListadoDeReportes
        reportes={reportes}
        hayMas={hayMas}
        estadoDeLista={estado}
        filtros={filtros}
        q={q}
        orden={orden}
        limite={limite}
      />
    </PaginaDePanel>
  );
}
