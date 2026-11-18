import { Plus, SlidersHorizontal } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import {
  descripcionDeFiltrosDeReportes,
  fechaDeCorte,
  ListadoDeReportes,
  leerUmbralDeAtraso,
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
import { AccionesDeCabecera } from "./accionesDeCabecera";
import {
  cargarFiltrosDeTerritorio,
  filtrosDeLaConsulta,
  leerLaBandeja,
} from "./cargaDeLaBandeja";
import { leerParametros } from "./parametros";

export const metadata: Metadata = { title: "Reportes" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Ruta fina: resuelve el contexto, busca o lista, y compone (tasks.md
 * 7.12). Sin guarda de rol propia -leer no es escribir, `listarReportes.ts`-;
 * el enlace de alta si exige `puedeEscribir`, mismo criterio que
 * `PaginaDePadron`: sin el, el rol de solo lectura llegaria a un formulario
 * que el caso de uso igual rechaza.
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
 *
 * S2 agrega el lugar y el area responsable. El `?lugar=` se resuelve contra
 * la API publica de `territorio` -este es el unico lugar donde los dos
 * modulos se tocan- y viaja como el conjunto de ids de su subarbol.
 *
 * `reportes-ux` (S2, S3, L9) convierte el estado en pestañas y los conteos en
 * el numero de cada pestaña, de cada opcion de area y del interruptor de
 * atrasados: por eso el corte se calcula **siempre** y los conteos se piden
 * con el eje de cada control quitado (`leerLaBandeja`).
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
  const territorio = await cargarFiltrosDeTerritorio(filtros, contexto);
  const corte = fechaDeCorte(hoy, umbral);
  const filtrosDeConsulta = filtrosDeLaConsulta({
    filtros,
    ...(territorio.lugarIds ? { lugarIds: territorio.lugarIds } : {}),
    ...(soloAtrasados ? { atrasadosDesde: corte } : {}),
  });

  // Un `?lugar=` que no es un lugar del municipio no se pinta ni se nombra:
  // el filtro no se aplico -lo resuelve `cargarFiltrosDeTerritorio`-, asi que
  // la pantalla no puede mostrar un chip de un filtro que no esta puesto.
  const { lugar: lugarPedido, ...sinLugar } = filtros;
  void lugarPedido;
  const filtrosDeLaPantalla = territorio.lugarIds ? filtros : sinLugar;

  const {
    reportes,
    hayMas,
    conteosPorEstado,
    conteosPorArea,
    totalDeAtrasados,
  } = await leerLaBandeja({
    filtros: filtrosDeConsulta,
    cadena: q,
    contexto,
    corte,
    ...(limite ? { limite } : {}),
    ...(orden ? { orden } : {}),
  });
  const estado = estadoDeLista({
    total: reportes.length,
    filtro: descripcionDeFiltrosDeReportes(filtrosDeLaPantalla, q, {
      soloAtrasados,
      lugares: territorio.lugares,
    }),
  });

  const alta = puedeEscribir(contexto.usuario.rol) ? (
    <EnlaceDeAccion href="/reportes/alta" variante="primaria">
      <Plus size={18} weight="bold" aria-hidden="true" />
      Registrar reporte
    </EnlaceDeAccion>
  ) : undefined;
  // S5: secundaria y solo para quien hoy administra los reportes. La accion
  // primaria de la pantalla es registrar, no configurar.
  const configuracion = puedeAdministrarReportes(contexto.usuario.rol) ? (
    <EnlaceDeAccion href="/reportes/configuracion" variante="secundaria">
      <SlidersHorizontal size={18} weight="bold" aria-hidden="true" />
      Configurar atraso
    </EnlaceDeAccion>
  ) : undefined;

  return (
    <PaginaDePanel
      titulo="Reportes ciudadanos"
      descripcion="Lo que reportan los vecinos y en qué orden conviene atenderlo."
      accion={<AccionesDeCabecera alta={alta} configuracion={configuracion} />}
    >
      {error ? <Aviso tono="error">{error}</Aviso> : null}

      {!puedeEscribir(contexto.usuario.rol) ? (
        <AvisoDePermiso
          capacidad="registrar reportes ciudadanos"
          requisito="un rol con permisos de escritura"
        />
      ) : null}

      <ListadoDeReportes
        reportes={reportes}
        hayMas={hayMas}
        estadoDeLista={estado}
        filtros={filtrosDeLaPantalla}
        umbral={umbral}
        hoy={hoy}
        lugares={territorio.opciones}
        conteosPorEstado={conteosPorEstado}
        conteosPorArea={conteosPorArea}
        totalDeAtrasados={totalDeAtrasados}
        soloAtrasados={soloAtrasados}
        q={q}
        orden={orden}
        limite={limite}
      />
    </PaginaDePanel>
  );
}
