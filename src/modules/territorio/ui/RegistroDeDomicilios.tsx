import { MapPin } from "@phosphor-icons/react/ssr";
import {
  Aviso,
  type ColumnaDeTabla,
  EnlaceDeAccion,
  type EstadoDeLista,
  EstadoVacio,
  type OpcionDeLista,
  Tabla,
} from "@/shared/ui";
import type {
  DomicilioDelRegistro,
  FiltrosDeRegistro,
} from "../application/puertosDeDomicilios";
import { avisoDePalabrasIgnoradas } from "../domain/busquedaPorPalabras";
import { FilaDeDomicilio } from "./FilaDeDomicilio";
import { FiltrosDeDomicilios } from "./FiltrosDeDomicilios";
import { hrefDeVerMasDeDomicilios } from "./hrefsDeDomicilios";
import { BarraDeAcciones } from "./PanelDeAccion";
import { PieDeDomicilios, ResumenDeDomicilios } from "./ResumenDeDomicilios";

type Props = {
  domicilios: readonly DomicilioDelRegistro[];
  hayMas: boolean;
  estadoDeLista: EstadoDeLista;
  filtros: FiltrosDeRegistro;
  /** El vigente, no el proximo: `hrefDeVerMasDeDomicilios` le suma la pagina. */
  limite?: number | undefined;
  raices: readonly OpcionDeLista[];
  puedeCrear: boolean;
  /** Domicilios del municipio sin filtros: el «de T» de la linea de conteo. */
  total?: number | undefined;
  /** Domicilios que dejan los filtros puestos: el «N» de la misma linea. */
  coincidencias?: number | undefined;
};

const COLUMNAS: readonly ColumnaDeTabla[] = [
  { clave: "domicilio", etiqueta: "Domicilio", ancho: "minmax(0,2fr)" },
  { clave: "lugar", etiqueta: "Asentamiento", ancho: "minmax(0,1fr)" },
];

const ALTA = "/territorio?accion=domicilio";

/** La accion primaria de la pantalla, con el permisos ya resuelto por la pagina. */
const AltaDeDomicilio = () => (
  <BarraDeAcciones>
    <EnlaceDeAccion href={ALTA} variante="primaria">
      <MapPin size={18} weight="bold" aria-hidden="true" />
      Registrar domicilio
    </EnlaceDeAccion>
  </BarraDeAcciones>
);

/**
 * El registro plano de domicilios del municipio, en la direccion de
 * `design/territorio-domicilios/01-una-busqueda-con-pista.html`: una sola
 * busqueda con pista (S9), la linea de conteo con sus chips y el pie (S10),
 * y una fila por domicilio que abre su panel.
 *
 * Los dos vacios siguen siendo distintos -lo resuelve `estadoDeLista`-: el de
 * filtro conserva la linea de conteo y los chips para quitar lo que dejo la
 * lista en cero, y el inicial ofrece cargar el primero.
 */
export function RegistroDeDomicilios({
  domicilios,
  hayMas,
  estadoDeLista: estado,
  filtros,
  limite,
  raices,
  puedeCrear,
  total,
  coincidencias,
}: Props) {
  const aviso = filtros.busqueda
    ? avisoDePalabrasIgnoradas(filtros.busqueda)
    : undefined;

  return (
    <div className="flex flex-col gap-4">
      {puedeCrear && estado.clase !== "vacio-inicial" ? (
        <AltaDeDomicilio />
      ) : null}

      <FiltrosDeDomicilios filtros={filtros} raices={raices} />

      {estado.clase === "vacio-inicial" ? (
        <EstadoVacio
          estado={estado}
          mensajeInicial="Todavía no hay domicilios registrados."
          hrefSinFiltro="/territorio/domicilios"
          {...(puedeCrear ? { accion: <AltaDeDomicilio /> } : {})}
        />
      ) : (
        <>
          <ResumenDeDomicilios
            mostrados={domicilios.length}
            total={total}
            coincidencias={coincidencias}
            filtros={filtros}
            raices={raices}
          />
          {aviso ? <Aviso tono="aviso">{aviso}</Aviso> : null}
          {estado.clase === "vacio-por-filtro" ? (
            <EstadoVacio
              estado={estado}
              mensajeInicial=""
              hrefSinFiltro="/territorio/domicilios"
            />
          ) : (
            <>
              <Tabla
                etiqueta="Domicilios del municipio"
                columnas={COLUMNAS}
                {...(hayMas
                  ? { verMas: hrefDeVerMasDeDomicilios({ filtros, limite }) }
                  : {})}
              >
                {domicilios.map((domicilio) => (
                  <FilaDeDomicilio key={domicilio.id} domicilio={domicilio} />
                ))}
              </Tabla>
              <PieDeDomicilios
                mostrados={domicilios.length}
                coincidencias={coincidencias}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
