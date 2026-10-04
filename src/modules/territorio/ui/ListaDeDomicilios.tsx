import {
  CeldaDeApoyo,
  CeldaPrincipal,
  type ColumnaDeTabla,
  FilaDeTabla,
  Tabla,
} from "@/shared/ui";
import type { DomicilioId, LugarId } from "../domain";
import { type NodoDomicilio, rutaDe } from "./contenido";
import type { NodoSeleccionado } from "./PanelDeNodo";
import { direccionDe } from "./vistaDeDomicilios";

type Props = {
  raizId: LugarId;
  lugar: NodoSeleccionado;
  filas: readonly NodoDomicilio[];
  /** El nombre del lugar que cuelga cada domicilio del subarbol. */
  nombreDeLugar: (lugarId: LugarId) => string;
  domicilioId: DomicilioId | undefined;
};

const COLUMNAS: readonly ColumnaDeTabla[] = [
  { clave: "domicilio", etiqueta: "Domicilio", ancho: "minmax(0,1fr)" },
];

/**
 * Cada fila es un enlace GET al panel del domicilio, en el lugar que lo
 * tiene. La tabla lista todo el subarbol, asi que el lugar solo se nombra
 * bajo la direccion cuando no es el que se esta viendo: una columna aparte
 * repetia el contexto en casi todas las filas.
 */
export function ListaDeDomicilios({
  raizId,
  lugar,
  filas,
  nombreDeLugar,
  domicilioId,
}: Props) {
  return (
    <Tabla etiqueta={`Domicilios de ${lugar.nombre}`} columnas={COLUMNAS}>
      {filas.map((fila) => {
        const direccion = direccionDe(fila.calle, fila.numero);
        const enOtroLugar = fila.lugarId !== lugar.id;

        return (
          <FilaDeTabla
            key={fila.id}
            href={`${rutaDe({
              raizId,
              nodoId: fila.lugarId,
              vista: "domicilios",
              domicilioId: fila.id,
            })}#panel-de-domicilio`}
            etiquetaAccesible={
              enOtroLugar
                ? `${direccion}, ${nombreDeLugar(fila.lugarId)}`
                : direccion
            }
            seleccionada={fila.id === domicilioId}
          >
            <span className="flex min-w-0 flex-col">
              <CeldaPrincipal>{direccion}</CeldaPrincipal>
              {enOtroLugar ? (
                <CeldaDeApoyo>{nombreDeLugar(fila.lugarId)}</CeldaDeApoyo>
              ) : null}
            </span>
          </FilaDeTabla>
        );
      })}
    </Tabla>
  );
}
