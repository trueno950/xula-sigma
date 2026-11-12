import { MapPin } from "@phosphor-icons/react/ssr";
import {
  Aviso,
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
import { calleYNumero, etiquetaDeDomicilio } from "../domain";
import { avisoDePalabrasIgnoradas } from "../domain/busquedaPorPalabras";
import { FiltrosDeDomicilios } from "./FiltrosDeDomicilios";
import { filtrosVisiblesDeDomicilios } from "./filtrosVisiblesDeDomicilios";
import {
  hrefDeDomicilioDelRegistro,
  hrefDeVerMasDeDomicilios,
  hrefSinFiltroDeDomicilios,
} from "./hrefsDeDomicilios";
import { BarraDeAcciones } from "./PanelDeAccion";

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
 * La fila no arma su direccion a mano: `calleYNumero` es la misma que usa el
 * arbol, para que un domicilio se lea igual en las dos pantallas. La raiz
 * queda fuera porque la columna Lugar es lo unico que la fila muestra.
 *
 * El chip repite la consulta tal como se escribio, y debajo el registro dice
 * cuantas palabras quedaron fuera del tope de la busqueda.
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
  const aviso = filtros.busqueda
    ? avisoDePalabrasIgnoradas(filtros.busqueda)
    : undefined;

  return (
    <div className="flex flex-col gap-4">
      {puedeCrear && estado.clase !== "vacio-inicial" ? (
        <BarraDeAcciones>
          <EnlaceDeAccion
            href="/territorio?accion=domicilio"
            variante="primaria"
          >
            <MapPin size={18} weight="bold" aria-hidden="true" />
            Registrar domicilio
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

      {aviso ? <Aviso tono="aviso">{aviso}</Aviso> : null}

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
                    <MapPin size={18} weight="bold" aria-hidden="true" />
                    Registrar domicilio
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
              etiquetaAccesible={etiquetaDeDomicilio({
                calle: domicilio.calle,
                numero: domicilio.numero,
                lugar: domicilio.lugar,
              })}
            >
              <CeldaPrincipal>{calleYNumero(domicilio)}</CeldaPrincipal>
              <CeldaDeApoyo>{domicilio.lugar}</CeldaDeApoyo>
            </FilaDeTabla>
          ))}
        </Tabla>
      )}
    </div>
  );
}
