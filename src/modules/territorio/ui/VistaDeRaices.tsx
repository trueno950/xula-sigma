import { AvisoDePermiso, EstadoVacio, estadoDeLista, Panel } from "@/shared/ui";
import type { ConteoDeLugar } from "../application/puertosDeContenidoDeLugares";
import { armarArbol, type LugarDelArbol } from "./arbolDeLugares";
import { BuscadorDeLugares } from "./BuscadorDeLugares";
import { FormularioDeAltaDeLugar } from "./FormularioDeAltaDeLugar";
import { NodoDelArbol } from "./NodoDelArbol";

export type { LugarDelArbol } from "./arbolDeLugares";

type Props = {
  raices: readonly LugarDelArbol[];
  /** Todos los lugares del municipio: de aca sale que cuelga de que. */
  lugares: readonly LugarDelArbol[];
  /** Una sola lectura agrupada de la pagina; sin ella las filas no cuentan. */
  cuentas?: readonly ConteoDeLugar[] | undefined;
  /** `?q=`: filtra por nombre, sin acentos ni mayusculas. */
  busqueda?: string | undefined;
  /**
   * No se deriva de `lugares`; el motivo vive en `application/puertos.ts`,
   * en el contrato de `RepositorioDeLugares.existeCabecera`.
   */
  hayCabecera: boolean;
  puedeEscribir: boolean;
  /** `?accion=lugar`: el alta esta abierta. */
  altaAbierta: boolean;
};

/**
 * La entrada de `/territorio`: los asentamientos del municipio y lo que
 * cuelga de ellos, hasta tres niveles, cada rama colapsable; lo que queda
 * mas adentro es un enlace a la vista de ese lugar. Un municipio con
 * trescientas manzanas volveria esta pantalla un scroll infinito, y la
 * tarea de todos los dias es entrar a un asentamiento, no leer el censo.
 *
 * Se arma con los lugares y las cuentas que la pagina ya trajo: una
 * consulta agrupada, nunca una por fila.
 *
 * El alta ya no vive en un panel lateral permanente. Ocupaba 320px fijos
 * estuviera o no en uso, y competia con la tarea de todos los dias.
 */
export function VistaDeRaices({
  raices,
  lugares,
  cuentas = [],
  busqueda,
  hayCabecera,
  puedeEscribir,
  altaAbierta,
}: Props) {
  const arbol = armarArbol({ raices, lugares, busqueda });
  const estado = estadoDeLista({ total: arbol.length, filtro: busqueda });
  const cuentasPorLugar = new Map(cuentas.map((c) => [c.lugarId, c]));

  return (
    <div className="flex flex-col gap-4">
      {!puedeEscribir ? (
        <AvisoDePermiso
          capacidad="agregar asentamientos al territorio"
          requisito="un rol con permisos de escritura"
        />
      ) : null}

      {raices.length > 0 || busqueda ? (
        <BuscadorDeLugares busqueda={busqueda} />
      ) : null}

      {estado.clase === "con-filas" ? (
        <ul
          aria-label="Asentamientos del municipio"
          className="flex flex-col divide-y divide-caliza-divisor overflow-clip rounded-lg border border-caliza-divisor bg-caliza-lienzo shadow-reposo"
        >
          {arbol.map((nodo) => (
            <NodoDelArbol
              key={nodo.lugar.id}
              nodo={nodo}
              cuentas={cuentasPorLugar}
              abrirTodo={Boolean(busqueda)}
            />
          ))}
        </ul>
      ) : altaAbierta ? null : (
        <EstadoVacio
          estado={estado}
          mensajeInicial="El municipio todavía no tiene asentamientos. Empiece por la cabecera o una comisaría."
          hrefSinFiltro="/territorio"
        />
      )}

      {puedeEscribir && altaAbierta ? (
        <Panel titulo="Agregar asentamiento">
          <FormularioDeAltaDeLugar
            hayCabecera={hayCabecera}
            volverA="/territorio"
          />
        </Panel>
      ) : null}
    </div>
  );
}
