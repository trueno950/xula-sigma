import { Plus } from "@phosphor-icons/react/ssr";
import {
  AvisoDePermiso,
  EnlaceDeAccion,
  EstadoVacio,
  estadoDeLista,
  Panel,
} from "@/shared/ui";
import type { ConteoDeLugar } from "../application/puertosDeContenidoDeLugares";
import { ANCLA_DE_ALTA, conAnclaDeAlta } from "./anclaDeAlta";
import {
  armarArbol,
  type LugarDelArbol,
  type NodoDeArbol,
} from "./arbolDeLugares";
import { BuscadorDeLugares } from "./BuscadorDeLugares";
import { FormularioDeAltaDeLugar } from "./FormularioDeAltaDeLugar";
import { NodoDelArbol } from "./NodoDelArbol";
import { ResumenDeTerritorio } from "./ResumenDeTerritorio";
import { tiposParaElAlta, tituloDelAlta, verboDelAlta } from "./tiposDelAlta";

export type { LugarDelArbol } from "./arbolDeLugares";

/**
 * Los domicilios del municipio, sumando las raices: la cuenta de cada lugar
 * ya incluye su subarbol, asi que bajar mas seria contar dos veces.
 */
const domiciliosDelMunicipio = ({
  raices,
  cuentas,
}: {
  raices: readonly LugarDelArbol[];
  cuentas: readonly ConteoDeLugar[];
}): number =>
  raices.reduce(
    (total, raiz) =>
      total +
      (cuentas.find((cuenta) => cuenta.lugarId === raiz.id)?.domicilios ?? 0),
    0,
  );

/**
 * Sin cuentas el municipio no se cuenta: un "0 domicilios" que solo dice que
 * la lectura fallo es peor que no decir nada. Buscando no hace falta, porque
 * esa linea cuenta lugares del arbol, no domicilios.
 */
const muestraElResumen = ({
  cuentas,
  busqueda,
  estado,
}: {
  cuentas: readonly ConteoDeLugar[];
  busqueda: string | undefined;
  estado: ReturnType<typeof estadoDeLista>;
}): boolean =>
  busqueda !== undefined ||
  (cuentas.length > 0 && estado.clase === "con-filas");

/** Con busqueda, el arbol trae los ancestros: solo cuentan las coincidencias. */
const lugaresQueCoinciden = (nodos: readonly NodoDeArbol[]): number =>
  nodos.reduce(
    (total, nodo) =>
      total + (nodo.coincide ? 1 : 0) + lugaresQueCoinciden(nodo.hijos),
    0,
  );

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
 * cuelga de ellos, hasta dos niveles, cada rama colapsable; lo que queda
 * mas adentro es un enlace a la vista de ese lugar. Un municipio con
 * trescientas colonias volveria esta pantalla un scroll infinito, y la
 * tarea de todos los dias es entrar a un asentamiento, no leer el censo.
 *
 * Se arma con los lugares y las cuentas que la pagina ya trajo: una
 * consulta agrupada, nunca una por fila.
 *
 * El alta ya no vive en un panel lateral permanente. Ocupaba 320px fijos
 * estuviera o no en uso, y competia con la tarea de todos los dias. Se
 * ofrece al pie del arbol, como secundaria -la primaria de la cabecera es
 * registrar un domicilio-, y abierta va arriba del arbol, a la vista.
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
  const tipos = tiposParaElAlta({ hayCabecera });

  return (
    <div className="flex flex-col gap-4 [&>a]:self-start max-sm:[&>a]:self-stretch">
      {!puedeEscribir ? (
        <AvisoDePermiso
          capacidad="agregar asentamientos al territorio"
          requisito="un rol con permisos de escritura"
        />
      ) : null}

      {puedeEscribir && altaAbierta ? (
        <Panel titulo={tituloDelAlta({ tipos })} id={ANCLA_DE_ALTA}>
          <FormularioDeAltaDeLugar
            hayCabecera={hayCabecera}
            volverA="/territorio"
          />
        </Panel>
      ) : null}

      {raices.length > 0 || busqueda ? (
        <BuscadorDeLugares busqueda={busqueda} />
      ) : null}

      {muestraElResumen({ cuentas, busqueda, estado }) ? (
        <ResumenDeTerritorio
          asentamientos={raices.length}
          domicilios={domiciliosDelMunicipio({ raices, cuentas })}
          busqueda={busqueda}
          encontrados={busqueda ? lugaresQueCoinciden(arbol) : undefined}
        />
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

      {puedeEscribir && !altaAbierta ? (
        <EnlaceDeAccion
          href={conAnclaDeAlta("/territorio?accion=lugar")}
          variante="secundaria"
        >
          <Plus size={18} weight="bold" aria-hidden="true" />
          {verboDelAlta(tipos) ?? "Agregar asentamiento"}
        </EnlaceDeAccion>
      ) : null}
    </div>
  );
}
