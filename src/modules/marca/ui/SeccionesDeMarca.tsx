import { ShieldSlash } from "@phosphor-icons/react/ssr";
import type { Marca } from "@/shared/marca";
import { CLASES_DE_ETIQUETA } from "@/shared/ui/estilos";
import { EscudoActual } from "./EscudoActual";
import { FilaDeMarca } from "./FilaDeMarca";
import { FormularioDeColores } from "./FormularioDeColores";
import { FormularioDeRestablecer } from "./FormularioDeRestablecer";
import { ImagenDeEscudo } from "./ImagenDeEscudo";
import type { ClaveDeErrorDeEscudo } from "./mensajesDeMarca";
import { resumenDeColores } from "./resumenDeColores";

type Props = {
  nombre: string;
  marca: Marca;
  /** El rechazo del archivo, que se pinta junto al campo (S9). */
  errorDeEscudo: ClaveDeErrorDeEscudo | undefined;
};

const HEADLINE =
  "text-[1.25rem] leading-[1.3] font-semibold tracking-[-0.01em] text-caliza-tinta";

/**
 * La tarjeta del indice. Sin `p-5` de `CLASES_DE_TARJETA`: el relleno es de
 * cada fila, para que el `summary` llegue de borde a borde y se pueda pulsar
 * en toda su altura.
 */
const CLASES_DE_INDICE =
  "overflow-clip rounded-lg border border-caliza-divisor bg-caliza-lienzo " +
  "text-caliza-tinta shadow-reposo [&>li+li]:border-t [&>li+li]:border-caliza-divisor";

/** Lo que la fila cerrada adelanta del escudo (S7). */
function MarcaDelEscudo({ escudo }: { escudo: string | undefined }) {
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-sm bg-marca-tenue">
      {escudo ? (
        <ImagenDeEscudo escudo={escudo} className="size-7 object-contain" />
      ) : (
        <ShieldSlash
          size={22}
          aria-hidden="true"
          className="text-caliza-apagada"
        />
      )}
    </span>
  );
}

/** Los dos colores guardados, en el resumen de la fila de colores (S1). */
function PuntosDeColor() {
  return (
    <span aria-hidden="true" className="flex shrink-0 items-center gap-1.5">
      <span className="size-5 rounded-full border border-caliza-divisor bg-marca" />
      <span className="size-5 rounded-full border border-caliza-divisor bg-acento" />
    </span>
  );
}

const estadoDelEscudo = (escudo: string | undefined): string =>
  escudo
    ? "Con escudo: la banda del municipio lo muestra junto al nombre."
    : "Sin escudo: la banda del municipio muestra solo el nombre.";

/**
 * Las tres secciones de `/marca` (S5), plegadas y de a una: el escudo primero
 * —es lo que la operadora viene a cambiar y lo que hoy falla sin JavaScript—,
 * los colores despues y el restablecimiento al final, que es lo unico
 * destructivo de la pantalla.
 *
 * El orden lo fija el artboard `02-vista-previa-primero` (L5); el compromiso
 * es que elegir un color pide dos toques y que dos cuerpos no se ven a la vez,
 * a cambio de que la pagina entera quepa en una pantalla cerrada y cada fila
 * diga su estado en una linea.
 */
export function SeccionesDeMarca({ nombre, marca, errorDeEscudo }: Props) {
  return (
    <section aria-labelledby="s-secciones" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="s-secciones" className={HEADLINE}>
          Secciones
        </h2>
        <p className={CLASES_DE_ETIQUETA}>
          Abra la que quiera cambiar. Solo hay una abierta a la vez; lo que se
          guarda sin abrir sigue igual.
        </p>
      </div>

      <ul className={CLASES_DE_INDICE}>
        <li>
          <FilaDeMarca
            titulo="Escudo del ayuntamiento"
            estado={estadoDelEscudo(marca.escudo)}
            extra={<MarcaDelEscudo escudo={marca.escudo} />}
            abierto
          >
            <EscudoActual
              nombre={nombre}
              escudo={marca.escudo}
              error={errorDeEscudo}
            />
          </FilaDeMarca>
        </li>
        <li>
          <FilaDeMarca
            titulo="Colores del municipio"
            estado={resumenDeColores(marca)}
            extra={<PuntosDeColor />}
          >
            <FormularioDeColores marca={marca} />
          </FilaDeMarca>
        </li>
        <li>
          <FilaDeMarca
            titulo="Restablecer colores"
            estado="Vuelve a Guinda y al acento por defecto de XULA. No toca el escudo."
          >
            <FormularioDeRestablecer />
          </FilaDeMarca>
        </li>
      </ul>
    </section>
  );
}
