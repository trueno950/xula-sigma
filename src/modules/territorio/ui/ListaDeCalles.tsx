import {
  CeldaDeDato,
  CeldaPrincipal,
  EstadoVacio,
  FilaDeTabla,
  Tabla,
} from "@/shared/ui";
import type { CalleId, LugarId } from "../domain";
import { rutaDe } from "./contenido";
import type { NodoSeleccionado } from "./PanelDeNodo";
import {
  type CalleParaPanel,
  COLUMNAS_DE_CALLES,
  estadoDeUbicacion,
} from "./vistaDeCalles";

type Props = {
  raizId: LugarId;
  lugar: NodoSeleccionado;
  calles: readonly CalleParaPanel[];
  calleId: CalleId | undefined;
};

/** Cada fila es un enlace GET: elegir una calle no guarda estado de cliente. */
export function ListaDeCalles({ raizId, lugar, calles, calleId }: Props) {
  if (calles.length === 0) {
    return (
      <EstadoVacio
        estado={{ clase: "vacio-inicial" }}
        mensajeInicial={`${lugar.nombre} no tiene calles todavía. Un domicilio necesita una.`}
        hrefSinFiltro={rutaDe({ raizId, nodoId: lugar.id, vista: "calles" })}
      />
    );
  }

  return (
    <Tabla etiqueta={`Calles de ${lugar.nombre}`} columnas={COLUMNAS_DE_CALLES}>
      {calles.map((calle) => (
        <FilaDeTabla
          key={calle.id}
          href={`${rutaDe({
            raizId,
            nodoId: lugar.id,
            vista: "calles",
            calleId: calle.id,
          })}#panel-de-calle`}
          etiquetaAccesible={`${calle.nombre}, ${estadoDeUbicacion(calle.punto)}`}
          seleccionada={calle.id === calleId}
        >
          <CeldaPrincipal>{calle.nombre}</CeldaPrincipal>
          <CeldaDeDato>{estadoDeUbicacion(calle.punto)}</CeldaDeDato>
        </FilaDeTabla>
      ))}
    </Tabla>
  );
}
