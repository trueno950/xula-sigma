import { Warning } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  CLASES_DE_DATO,
  CLASES_DE_ETIQUETA,
  EnlaceDeAccion,
  EstadoVacio,
  estadoDeLista,
  Panel,
} from "@/shared/ui";
import { type LugarId, puedeSerRaiz, type TipoDeLugar } from "../domain";
import { masAdentroDe } from "./conteo";
import { FormularioDeAltaDeLugar } from "./FormularioDeAltaDeLugar";

/** Lo minimo para dibujar el arbol: lo tienen `LugarGuardado` y el subarbol. */
export type LugarDelArbol = {
  id: LugarId;
  nombre: string;
  tipo: TipoDeLugar;
  padreId: LugarId | null;
};

type Props = {
  raices: readonly LugarDelArbol[];
  /** Todos los lugares del municipio: de aca sale que cuelga de que. */
  lugares: readonly LugarDelArbol[];
  puedeEscribir: boolean;
  /** `?accion=lugar`: el alta esta abierta. */
  altaAbierta: boolean;
  /** El mismo boton que la cabecera, para el vacio inicial. */
  accionDeAlta: ReactNode;
};

const CLASE_FILA =
  "flex min-h-11 flex-wrap items-center gap-x-3 gap-y-0.5 rounded-sm px-3 py-2 transition-colors hover:bg-caliza-superficie focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-marca";

/**
 * La entrada de `/territorio`: los asentamientos del municipio y, indentado,
 * lo que cuelga directo de cada uno.
 *
 * **Dos niveles y no el arbol entero**: un municipio con trescientas
 * manzanas cargadas volveria esta pantalla un scroll infinito, y la tarea
 * de todos los dias es entrar a un asentamiento, no leer el censo. El
 * segundo nivel esta porque sin el la lista era plana y no habia forma de
 * ver que cuelga de que — que es justo lo que hace falta para notar que
 * algo quedo colgado donde no va.
 *
 * Se arma con los lugares que la pagina ya trajo para el catalogo del alta:
 * cero consultas nuevas.
 *
 * El alta ya no vive en un panel lateral permanente. Ocupaba 320px fijos
 * estuviera o no en uso, y competia con la tarea de todos los dias.
 */
export function VistaDeRaices({
  raices,
  lugares,
  puedeEscribir,
  altaAbierta,
  accionDeAlta,
}: Props) {
  const estado = estadoDeLista({ total: raices.length });
  const hijosDe = (padreId: LugarId) =>
    lugares.filter((lugar) => lugar.padreId === padreId);

  return (
    <div className="flex flex-col gap-4">
      {estado.clase === "con-filas" ? (
        <ul aria-label="Asentamientos del municipio" className="flex flex-col">
          {raices.map((raiz) => {
            const hijos = hijosDe(raiz.id);
            const masAdentro = masAdentroDe(
              hijos.map((h) => h.id),
              lugares,
            );

            return (
              <li key={raiz.id} className="border-b border-caliza-divisor py-1">
                <Link
                  href={`/territorio?raiz=${raiz.id}`}
                  className={CLASE_FILA}
                >
                  <span className="text-[15px] font-medium text-caliza-tinta">
                    {raiz.nombre}
                  </span>
                  <span className={CLASES_DE_DATO}>{raiz.tipo}</span>
                  {/*
                    `tipoDeLugar.ts` dice que un rango 0 es "raiz por
                    construccion". Lo contrario -una colonia, un sector o
                    una manzana arriba de todo- ya no se puede crear:
                    `altaDeLugar` y `reparentearLugar` lanzan
                    `RaizInvalidaError`. Lo que queda aca es dato anterior a
                    esa regla, y la pantalla lo senala en vez de esconderlo
                    porque hay que moverlo a mano. `scripts/auditar-raices.sql`
                    es el mismo barrido del lado de la base.
                  */}
                  {puedeSerRaiz(raiz.tipo) ? null : (
                    <span className="flex items-center gap-1 text-[13px] font-medium text-senial-aviso">
                      <Warning size={14} weight="fill" aria-hidden="true" />
                      Deberia colgar de un asentamiento
                    </span>
                  )}
                </Link>

                {hijos.length > 0 ? (
                  <ul className="flex flex-col border-l border-caliza-divisor pl-3 ml-3">
                    {hijos.map((hijo) => (
                      <li key={hijo.id}>
                        <Link
                          href={`/territorio?raiz=${raiz.id}&nodo=${hijo.id}`}
                          className={CLASE_FILA}
                        >
                          <span className="text-[15px] text-caliza-tinta">
                            {hijo.nombre}
                          </span>
                          <span className={CLASES_DE_DATO}>{hijo.tipo}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {masAdentro > 0 ? (
                  <p className={`${CLASES_DE_ETIQUETA} px-3 pb-1 pl-9`}>
                    {masAdentro} lugar{masAdentro === 1 ? "" : "es"} mas
                    adentro.
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : altaAbierta ? null : (
        <EstadoVacio
          estado={estado}
          mensajeInicial="El municipio todavia no tiene asentamientos. Empiece por la cabecera o una comisaria."
          hrefSinFiltro="/territorio"
          {...(puedeEscribir ? { accion: accionDeAlta } : {})}
        />
      )}

      {puedeEscribir && altaAbierta ? (
        <Panel titulo="Agregar un asentamiento">
          <FormularioDeAltaDeLugar />
          <EnlaceDeAccion href="/territorio" variante="fantasma">
            Cancelar
          </EnlaceDeAccion>
        </Panel>
      ) : null}
    </div>
  );
}
