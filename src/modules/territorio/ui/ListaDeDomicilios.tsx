import {
  CeldaDeApoyo,
  CeldaPrincipal,
  type ColumnaDeTabla,
  EstadoVacio,
  estadoDeLista,
  FilaDeTabla,
  Tabla,
} from "@/shared/ui";
import {
  calleYNumero,
  type DomicilioId,
  etiquetaDeDomicilio,
  type LugarId,
} from "../domain";
import {
  type DomicilioDeLaPestana,
  type PaginaDeDomicilios,
  rutaDe,
} from "./contenido";
import {
  conFiltrosDeLaPestana,
  type FiltrosDeLaPestana,
  hrefDeVerMasDeLaPestana,
} from "./hrefsDeLaPestana";
import type { NodoSeleccionado } from "./PanelDeNodo";

type Props = FiltrosDeLaPestana & {
  raizId: LugarId;
  lugar: NodoSeleccionado;
  filas: readonly DomicilioDeLaPestana[];
  hayMas: boolean;
  domicilioId: DomicilioId | undefined;
};

const COLUMNAS: readonly ColumnaDeTabla[] = [
  { clave: "domicilio", etiqueta: "Domicilio", ancho: "minmax(0,1fr)" },
];

/**
 * Cada fila es un enlace GET al panel del domicilio, en el lugar que lo
 * tiene, y conserva `?q=` y `?limite=` para no volver a la primera pagina.
 * La tabla lista todo el subarbol, asi que el lugar solo se nombra bajo la
 * direccion cuando no es el que se esta viendo: una columna aparte repetia
 * el contexto en casi todas las filas.
 */
export function ListaDeDomicilios({
  raizId,
  lugar,
  filas,
  hayMas,
  domicilioId,
  busqueda,
  limite,
}: Props) {
  return (
    <Tabla
      etiqueta={`Domicilios de ${lugar.nombre}`}
      columnas={COLUMNAS}
      {...(hayMas
        ? {
            verMas: hrefDeVerMasDeLaPestana({
              raizId,
              nodoId: lugar.id,
              vista: "domicilios",
              busqueda,
              limite,
            }),
          }
        : {})}
    >
      {filas.map((fila) => {
        const direccion = calleYNumero(fila);
        const enOtroLugar = fila.lugarId !== lugar.id;

        return (
          <FilaDeTabla
            key={fila.id}
            href={`${conFiltrosDeLaPestana(
              rutaDe({
                raizId,
                nodoId: fila.lugarId,
                vista: "domicilios",
                domicilioId: fila.id,
              }),
              { busqueda, limite },
            )}#panel-de-domicilio`}
            etiquetaAccesible={
              enOtroLugar
                ? etiquetaDeDomicilio({
                    calle: fila.calle,
                    numero: fila.numero,
                    lugar: fila.lugar,
                  })
                : direccion
            }
            seleccionada={fila.id === domicilioId}
          >
            <span className="flex min-w-0 flex-col">
              <CeldaPrincipal>{direccion}</CeldaPrincipal>
              {enOtroLugar ? <CeldaDeApoyo>{fila.lugar}</CeldaDeApoyo> : null}
            </span>
          </FilaDeTabla>
        );
      })}
    </Tabla>
  );
}

/**
 * La pagina de la pestana, o el vacio de una busqueda sin resultados. El
 * vacio inicial -ningun domicilio y ninguna busqueda- lo decide antes
 * `TabDeDomicilios`, porque ofrece cargar el primero.
 */
export function PaginaOVacioPorFiltro({
  domicilios,
  ...resto
}: Omit<Props, "filas" | "hayMas"> & {
  domicilios: PaginaDeDomicilios | undefined;
}) {
  const filas = domicilios?.filas ?? [];
  const estado = estadoDeLista({ total: filas.length, filtro: resto.busqueda });

  if (estado.clase === "con-filas") {
    return (
      <ListaDeDomicilios
        {...resto}
        filas={filas}
        hayMas={domicilios?.hayMas ?? false}
      />
    );
  }

  return (
    <EstadoVacio
      estado={estado}
      mensajeInicial=""
      hrefSinFiltro={rutaDe({
        raizId: resto.raizId,
        nodoId: resto.lugar.id,
        vista: "domicilios",
      })}
    />
  );
}
