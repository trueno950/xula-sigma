import { Plus, SlidersHorizontal } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import {
  buscarReportes,
  descripcionDeFiltrosDeReportes,
  type FiltrosDeListado,
  fechaDeCorte,
  ListadoDeReportes,
  leerUmbralDeAtraso,
  listarReportes,
} from "@/modules/reportes";
import { contextoActual } from "@/shared/auth";
import { puedeAdministrarReportes, puedeEscribir } from "@/shared/auth/roles";
import { hoyEnMerida } from "@/shared/lib/fecha";
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
 *
 * S1 de `gestion-municipal` agrega el umbral de atraso: el `?atrasados=1` de
 * la URL se resuelve aca a la fecha civil de corte -con el umbral del
 * municipio y el dia de hoy en Merida- y viaja al repositorio como
 * condicion de SQL, para que el filtro recorte antes de paginar. La
 * insignia de cada fila la calcula `ListadoDeReportes` con el mismo umbral y
 * el mismo dia.
 */
export default async function PaginaDeReportes({ searchParams }: Props) {
  const contexto = await contextoActual();

  if (!contexto) {
    return <PantallaDeMensaje mensaje="No se pudo determinar su sesión." />;
  }

  const { filtros, q, limite, orden, error, soloAtrasados } = leerParametros(
    await searchParams,
  );
  const umbral = await leerUmbralDeAtraso(contexto);
  const hoy = hoyEnMerida();
  const filtrosDeConsulta: FiltrosDeListado = soloAtrasados
    ? { ...filtros, atrasadosDesde: fechaDeCorte(hoy, umbral) }
    : filtros;

  const opciones = {
    ...(limite ? { limite } : {}),
    ...(orden ? { orden } : {}),
  };
  const { reportes, hayMas } = q
    ? await buscarReportes(q, contexto, {
        filtros: filtrosDeConsulta,
        ...opciones,
      })
    : await listarReportes(filtrosDeConsulta, contexto, opciones);
  const estado = estadoDeLista({
    total: reportes.length,
    filtro: descripcionDeFiltrosDeReportes(filtros, q, soloAtrasados),
  });

  const alta = puedeEscribir(contexto.usuario.rol) ? (
    <EnlaceDeAccion href="/reportes/alta" variante="primaria">
      <Plus size={18} weight="bold" aria-hidden="true" />
      Registrar reporte
    </EnlaceDeAccion>
  ) : undefined;
  const configuracion = puedeAdministrarReportes(contexto.usuario.rol) ? (
    <EnlaceDeAccion href="/reportes/configuracion" variante="secundaria">
      <SlidersHorizontal size={18} weight="bold" aria-hidden="true" />
      Configurar atraso
    </EnlaceDeAccion>
  ) : undefined;
  const puedeActuar = puedeEscribir(contexto.usuario.rol);

  return (
    <PaginaDePanel
      titulo="Reportes ciudadanos"
      accion={
        alta && configuracion ? (
          <div className="flex flex-wrap gap-2">
            {configuracion}
            {alta}
          </div>
        ) : (
          (alta ?? configuracion)
        )
      }
    >
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
        umbral={umbral}
        hoy={hoy}
        soloAtrasados={soloAtrasados}
        q={q}
        orden={orden}
        limite={limite}
      />
    </PaginaDePanel>
  );
}
