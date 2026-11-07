import {
  CeldaPrincipal,
  EstadoVacio,
  estadoDeLista,
  FilaDeTabla,
  Tabla,
} from "@/shared/ui";
import type { CalleId, LugarId } from "../domain";
import { rutaDe } from "./contenido";
import {
  conFiltrosDeLaPestana,
  type FiltrosDeLaPestana,
  hrefDeVerMasDeLaPestana,
} from "./hrefsDeLaPestana";
import { InsigniaDeUbicacion } from "./InsigniaDeUbicacion";
import type { NodoSeleccionado } from "./PanelDeNodo";
import {
  type CalleParaPanel,
  COLUMNAS_DE_CALLES,
  estadoDeUbicacion,
} from "./vistaDeCalles";

type Props = FiltrosDeLaPestana & {
  raizId: LugarId;
  lugar: NodoSeleccionado;
  /** La pagina visible, ya filtrada por la busqueda (`paginaDeCalles`). */
  calles: readonly CalleParaPanel[];
  hayMas: boolean;
  calleId: CalleId | undefined;
};

/**
 * Cada fila es un enlace GET: elegir una calle no guarda estado de cliente.
 * La fila conserva `?q=` y `?limite=` para que la lista no vuelva a la
 * primera pagina al abrir una calle de la segunda.
 */
export function ListaDeCalles({
  raizId,
  lugar,
  calles,
  hayMas,
  calleId,
  busqueda,
  limite,
}: Props) {
  const estado = estadoDeLista({ total: calles.length, filtro: busqueda });
  const ruta = rutaDe({ raizId, nodoId: lugar.id, vista: "calles" });

  if (estado.clase !== "con-filas") {
    return (
      <EstadoVacio
        estado={estado}
        mensajeInicial={`${lugar.nombre} no tiene calles todavía. Un domicilio necesita una.`}
        hrefSinFiltro={ruta}
      />
    );
  }

  return (
    <Tabla
      etiqueta={`Calles de ${lugar.nombre}`}
      columnas={COLUMNAS_DE_CALLES}
      {...(hayMas
        ? {
            verMas: hrefDeVerMasDeLaPestana({
              raizId,
              nodoId: lugar.id,
              vista: "calles",
              busqueda,
              limite,
            }),
          }
        : {})}
    >
      {calles.map((calle) => (
        <FilaDeTabla
          key={calle.id}
          href={`${conFiltrosDeLaPestana(
            rutaDe({
              raizId,
              nodoId: lugar.id,
              vista: "calles",
              calleId: calle.id,
            }),
            { busqueda, limite },
          )}#panel-de-calle`}
          etiquetaAccesible={`${calle.nombre}, ${estadoDeUbicacion(calle.punto)}`}
          seleccionada={calle.id === calleId}
        >
          <CeldaPrincipal>{calle.nombre}</CeldaPrincipal>
          <span>
            <InsigniaDeUbicacion punto={calle.punto} />
          </span>
        </FilaDeTabla>
      ))}
    </Tabla>
  );
}
