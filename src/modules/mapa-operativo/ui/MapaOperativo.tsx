import { Aviso, EstadoVacio, estadoDeLista } from "@/shared/ui";
import type { FiltrosDeMapa } from "../application";
import type {
  MapaOperativoAgregado,
  PanelDeCalles,
  TerritorioDeMapa,
} from "../domain";
import { FilaDeResumen } from "./FilaDeResumen";
import { FormularioDeFiltrosDeMapa } from "./FormularioDeFiltrosDeMapa";
import { LeyendaDelMapa } from "./LeyendaDelMapa";
import { MapaYCalles } from "./MapaYCalles";
import {
  chipsDeFiltro,
  pestanasDePanel,
  resumenDelMapa,
} from "./resumenDelMapa";
import { SinUbicar } from "./SinUbicar";
import { hrefDelMapa } from "./urlDelMapa";

type Props = {
  mapa: MapaOperativoAgregado;
  filtros: FiltrosDeMapa;
  panel: PanelDeCalles;
};

/**
 * El aviso de S2: un territorio sin calles ubicadas no tiene caja que
 * bloquear, asi que el mapa vuelve a la vista de Yucatan. Se dice, no se
 * inventa un centro.
 */
export const mensajeSinCalles = (territorio: TerritorioDeMapa | null) =>
  `Sin calles ubicadas en ${territorio?.nombre ?? "el municipio"}. El mapa muestra todo Yucatán.`;

const SIN_HECHOS = "Todavía no hay reportes ni obras abiertas en el municipio.";

/**
 * La pantalla en el orden de S1: filtros, resumen con sus chips, y el mapa con
 * el panel. La actualizacion en vivo y la descripcion viven en la cabecera de
 * `PaginaDePanel`, que es de la pagina, no del mapa.
 *
 * Con hechos, el mapa y su panel van juntos a `MapaYCalles`, que es el unico
 * componente cliente: elegir una fila o un pin es estado de la vista.
 */
export function MapaOperativo({ mapa, filtros, panel }: Props) {
  const resumen = resumenDelMapa(mapa);
  const chips = chipsDeFiltro(filtros, mapa.territorioElegido);
  const estado = estadoDeLista({
    total: mapa.conteos.total,
    filtro:
      chips.length === 0
        ? undefined
        : chips.map((chip) => chip.etiqueta).join(", "),
  });

  return (
    <section aria-label="Mapa operativo" className="flex flex-col gap-4">
      <FormularioDeFiltrosDeMapa
        {...filtros}
        territorios={mapa.territorios}
        activos={chips.length}
      />
      <FilaDeResumen chips={chips} resumen={resumen} />
      {mapa.caja === null ? (
        <Aviso tono="aviso">{mensajeSinCalles(mapa.territorioElegido)}</Aviso>
      ) : null}
      {estado.clase === "con-filas" ? (
        <MapaYCalles
          marcadores={mapa.marcadores}
          caja={mapa.caja}
          panel={panel}
          pestanas={pestanasDePanel({
            filtros,
            panel,
            calles: mapa.marcadores.length,
            sinUbicar: resumen.totalSinUbicar,
          })}
          leyenda={<LeyendaDelMapa leyenda={mapa.leyenda} />}
          sinUbicar={
            <SinUbicar sinUbicar={mapa.sinUbicar} cobertura={mapa.cobertura} />
          }
        />
      ) : (
        <>
          <EstadoVacio
            estado={estado}
            mensajeInicial={SIN_HECHOS}
            hrefSinFiltro={hrefDelMapa({})}
          />
          {/* Sin hechos no hay panel, pero las calles sin punto existen igual:
              sin esta seccion el resumen las contaria y nadie podria abrirlas. */}
          {resumen.totalSinUbicar > 0 ? (
            <SinUbicar sinUbicar={mapa.sinUbicar} cobertura={mapa.cobertura} />
          ) : null}
        </>
      )}
    </section>
  );
}
