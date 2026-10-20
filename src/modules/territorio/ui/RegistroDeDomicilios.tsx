import { Plus } from "@phosphor-icons/react/ssr";
import {
  CeldaDeApoyo,
  CeldaPrincipal,
  ChipDeFiltro,
  type ColumnaDeTabla,
  EnlaceDeAccion,
  type EstadoDeLista,
  EstadoVacio,
  FilaDeTabla,
  type OpcionDeLista,
  Tabla,
} from "@/shared/ui";
import type {
  DomicilioDelRegistro,
  FiltrosDeRegistro,
} from "../application/puertosDeDomicilios";
import { FiltrosDeDomicilios } from "./FiltrosDeDomicilios";
import { filtrosVisiblesDeDomicilios } from "./filtrosVisiblesDeDomicilios";
import {
  hrefDeDomicilioDelRegistro,
  hrefDeVerMasDeDomicilios,
  hrefSinFiltroDeDomicilios,
} from "./hrefsDeDomicilios";
import { BarraDeAcciones } from "./PanelDeAccion";
import { direccionDe } from "./vistaDeDomicilios";

type Props = {
  domicilios: readonly DomicilioDelRegistro[];
  hayMas: boolean;
  estadoDeLista: EstadoDeLista;
  filtros: FiltrosDeRegistro;
  /** El vigente, no el proximo: `hrefDeVerMasDeDomicilios` le suma la pagina. */
  limite?: number | undefined;
  raices: readonly OpcionDeLista[];
  puedeCrear: boolean;
};

const COLUMNAS: readonly ColumnaDeTabla[] = [
  { clave: "domicilio", etiqueta: "Domicilio", ancho: "minmax(0,2fr)" },
  { clave: "lugar", etiqueta: "Lugar", ancho: "minmax(0,1fr)" },
];

/**
 * El registro plano de domicilios del municipio: busqueda por calle y
 * numero, filtro por asentamiento y paginacion por `?limite=`, las tres
 * secciones de `design.md` seccion 1. Cada fila abre el panel del
 * domicilio en su lugar; `hrefDeDomicilioDelRegistro` arma ese destino con
 * la raiz que trae la fila.
 *
 * La fila no arma su direccion a mano: `direccionDe` es la misma que usa el
 * arbol, para que un domicilio se lea igual en las dos pantallas.
 */
export function RegistroDeDomicilios({
  domicilios,
  hayMas,
  estadoDeLista: estado,
  filtros,
  limite,
  raices,
  puedeCrear,
}: Props) {
  const nombreDeRaiz = (id: string) =>
    raices.find((raiz) => raiz.valor === id)?.etiqueta;
  const chips = filtrosVisiblesDeDomicilios(filtros, nombreDeRaiz);

  return (
    <div className="flex flex-col gap-4">
      {puedeCrear && estado.clase !== "vacio-inicial" ? (
        <BarraDeAcciones>
          <EnlaceDeAccion
            href="/territorio?accion=domicilio"
            variante="primaria"
          >
            <Plus size={18} weight="bold" aria-hidden="true" />
            Agregar domicilio
          </EnlaceDeAccion>
        </BarraDeAcciones>
      ) : null}

      <FiltrosDeDomicilios filtros={filtros} raices={raices} />

      {chips.length > 0 ? (
        <ul aria-label="Filtros aplicados" className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <li key={chip.clave}>
              <ChipDeFiltro
                etiqueta={chip.etiqueta}
                hrefQuitar={hrefSinFiltroDeDomicilios(filtros, chip.clave)}
              />
            </li>
          ))}
        </ul>
      ) : null}

      {estado.clase !== "con-filas" ? (
        <EstadoVacio
          estado={estado}
          mensajeInicial="Todavía no hay domicilios registrados."
          {...(puedeCrear
            ? {
                accion: (
                  <EnlaceDeAccion
                    href="/territorio?accion=domicilio"
                    variante="primaria"
                  >
                    <Plus size={18} weight="bold" aria-hidden="true" />
                    Agregar domicilio
                  </EnlaceDeAccion>
                ),
              }
            : {})}
          hrefSinFiltro="/territorio/domicilios"
        />
      ) : (
        <Tabla
          etiqueta="Domicilios del municipio"
          columnas={COLUMNAS}
          {...(hayMas
            ? { verMas: hrefDeVerMasDeDomicilios({ filtros, limite }) }
            : {})}
        >
          {domicilios.map((domicilio) => (
            <FilaDeTabla
              key={domicilio.id}
              href={hrefDeDomicilioDelRegistro(domicilio)}
              etiquetaAccesible={`${direccionDe(
                domicilio.calle,
                domicilio.numero,
              )}, ${domicilio.lugar}`}
            >
              <CeldaPrincipal>
                {direccionDe(domicilio.calle, domicilio.numero)}
              </CeldaPrincipal>
              <CeldaDeApoyo>{domicilio.lugar}</CeldaDeApoyo>
            </FilaDeTabla>
          ))}
        </Tabla>
      )}
    </div>
  );
}
