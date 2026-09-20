import { Plus } from "@phosphor-icons/react/ssr";
import {
  CeldaDeDato,
  CeldaPrincipal,
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
import { hrefDeVerMasDeDomicilios } from "./hrefsDeDomicilios";
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
 * secciones de `design.md` seccion 1. Sin enlace en la fila: un domicilio
 * todavia no tiene pantalla propia, mismo criterio que `TabDeDomicilios`.
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
  return (
    <div className="flex flex-col gap-4">
      {puedeCrear ? (
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

      {estado.clase !== "con-filas" ? (
        <EstadoVacio
          estado={estado}
          mensajeInicial="Todavia no hay domicilios registrados."
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
              etiquetaAccesible={`${direccionDe(
                domicilio.calle,
                domicilio.numero,
              )}, ${domicilio.lugar}`}
            >
              <CeldaPrincipal>
                {direccionDe(domicilio.calle, domicilio.numero)}
              </CeldaPrincipal>
              <CeldaDeDato>{domicilio.lugar}</CeldaDeDato>
            </FilaDeTabla>
          ))}
        </Tabla>
      )}
    </div>
  );
}
