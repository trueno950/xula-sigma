import type { ReactNode } from "react";
import {
  CeldaPrincipal,
  CLASES_DE_ETIQUETA,
  EstadoVacio,
  estadoDeLista,
  FilaDeTabla,
  Tabla,
} from "@/shared/ui";
import type { DetalleDeCalle } from "../application/puertosDeDetallesDeCalles";
import type { CalleId, LugarId } from "../domain";
import { rutaDe } from "./contenido";
import {
  conFiltrosDeLaPestana,
  type FiltrosDeLaPestana,
  hrefDeVerMasDeLaPestana,
} from "./hrefsDeLaPestana";
import { InsigniaDeUbicacion } from "./InsigniaDeUbicacion";
import type { NodoSeleccionado } from "./PanelDeNodo";
import { ResumenDeCalles } from "./ResumenDeCalles";
import {
  type CalleParaPanel,
  COLUMNAS_DE_CALLES,
  COLUMNAS_DE_CALLES_SIN_DETALLE,
  estadoDeUbicacion,
  SIN_ZONA,
} from "./vistaDeCalles";

type Props = FiltrosDeLaPestana & {
  raizId: LugarId;
  lugar: NodoSeleccionado;
  /** La pagina visible, ya filtrada por la busqueda (`paginaDeCalles`). */
  calles: readonly CalleParaPanel[];
  hayMas: boolean;
  /** Todas las calles que dejo la busqueda, no solo las de la pagina. */
  coincidencias: number;
  calleId: CalleId | undefined;
  /** Zona y domicilios por calle; `undefined` si la lectura fallo. */
  detalles?: readonly DetalleDeCalle[] | undefined;
};

/**
 * Una celda con dato de apoyo. En el telefono la fila se parte en dos
 * renglones -nombre arriba, zona, cuenta y ubicacion abajo-, asi que las
 * tres celdas viajan dentro de un mismo contenedor que en escritorio se
 * disuelve (`sm:contents`) y las devuelve a su columna de la tabla.
 */
function ApoyoDeLaFila({
  zona,
  domicilios,
  children,
}: {
  zona: string | null;
  domicilios: number;
  children: ReactNode;
}) {
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:contents">
      <span
        className={zona ? "text-[15px]" : "text-[15px] text-caliza-apagada"}
      >
        {zona ?? SIN_ZONA}
      </span>
      <span className={`${CLASES_DE_ETIQUETA} tabular-nums`}>
        {domicilios} {domicilios === 1 ? "domicilio" : "domicilios"}
      </span>
      {children}
    </span>
  );
}

/**
 * Cada fila es un enlace GET: elegir una calle no guarda estado de cliente.
 * La fila conserva `?q=` y `?limite=` para que la lista no vuelva a la
 * primera pagina al abrir una calle de la segunda.
 *
 * Con la lectura de detalles (S8 de `odd/tasks/territorio-ux.md`) cada fila
 * dice ademas su zona y cuantos domicilios la usan como calle.
 */
export function ListaDeCalles({
  raizId,
  lugar,
  calles,
  hayMas,
  coincidencias,
  calleId,
  busqueda,
  limite,
  detalles,
}: Props) {
  const estado = estadoDeLista({ total: calles.length, filtro: busqueda });
  const ruta = rutaDe({ raizId, nodoId: lugar.id, vista: "calles" });
  const porCalle = new Map(
    (detalles ?? []).map((fila) => [fila.calleId, fila]),
  );

  return (
    <div className="flex flex-col gap-4">
      <ResumenDeCalles
        raizId={raizId}
        nodoId={lugar.id}
        coincidencias={coincidencias}
        busqueda={busqueda}
      />

      {estado.clase !== "con-filas" ? (
        <EstadoVacio
          estado={estado}
          mensajeInicial={`${lugar.nombre} no tiene calles todavía. Un domicilio necesita una.`}
          hrefSinFiltro={ruta}
        />
      ) : (
        <Tabla
          etiqueta={`Calles de ${lugar.nombre}`}
          columnas={
            detalles ? COLUMNAS_DE_CALLES : COLUMNAS_DE_CALLES_SIN_DETALLE
          }
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
          {calles.map((calle) => {
            const detalle = porCalle.get(calle.id);
            const ubicacion = (
              <span>
                <InsigniaDeUbicacion punto={calle.punto} />
              </span>
            );

            return (
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
                etiquetaAccesible={
                  detalle
                    ? `${calle.nombre}, ${detalle.zona ?? SIN_ZONA}, ${detalle.domicilios} ${detalle.domicilios === 1 ? "domicilio" : "domicilios"}, ${estadoDeUbicacion(calle.punto)}`
                    : `${calle.nombre}, ${estadoDeUbicacion(calle.punto)}`
                }
                seleccionada={calle.id === calleId}
              >
                <CeldaPrincipal>{calle.nombre}</CeldaPrincipal>
                {detalle ? (
                  <ApoyoDeLaFila
                    zona={detalle.zona}
                    domicilios={detalle.domicilios}
                  >
                    {ubicacion}
                  </ApoyoDeLaFila>
                ) : (
                  ubicacion
                )}
              </FilaDeTabla>
            );
          })}
        </Tabla>
      )}
    </div>
  );
}
