import Link from "next/link";
import { CLASES_DE_ENLACE } from "@/shared/ui";
import type {
  CoberturaFaltante,
  RazonDeCoberturaFaltante,
  TerritorioSinUbicar,
} from "../domain";
import { CallesSinUbicar } from "./CallesSinUbicar";
import { etiquetaDeRecurso } from "./etiquetasDeRecurso";

type Props = {
  sinUbicar: readonly TerritorioSinUbicar[];
  cobertura: readonly CoberturaFaltante[];
};

const FILA =
  "flex flex-wrap items-baseline gap-x-2 border-b border-caliza-divisor px-4 py-2 text-[15px] last:border-b-0";
const NADA = "px-4 py-6 text-[15px] text-caliza-apagada";

const razonDe = (
  razon: RazonDeCoberturaFaltante,
  calle: string | null,
): string =>
  razon === "SIN_CALLE" ? "sin calle" : `calle sin punto: ${calle ?? "?"}`;

/**
 * S6: «Sin ubicar» junta en un solo lugar lo que antes eran dos secciones
 * sueltas debajo del mapa -las calles sin punto y los hechos que no se pueden
 * dibujar-. Las dos comparten el mismo problema -falta un punto- y por eso
 * comparten pestana.
 *
 * El aviso de la pestana dice para que se abre cada renglon: sin el, la lista
 * se lee como un inventario y no como trabajo pendiente.
 */
export function SinUbicar({ sinUbicar, cobertura }: Props) {
  if (sinUbicar.length === 0 && cobertura.length === 0) {
    return (
      <p className={NADA}>
        Todo lo que hay tiene punto en el mapa: no quedó nada sin ubicar.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-3">
      <p className="text-[13px] text-caliza-apagada">
        No se pueden dibujar hasta que tengan punto. Ábralos para ubicarlos.
      </p>
      <CallesSinUbicar sinUbicar={sinUbicar} />
      {cobertura.length === 0 ? null : (
        <div className="flex flex-col gap-1">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-caliza-tinta">
            Hechos sin punto
          </h2>
          <ul className="flex flex-col" aria-label="Hechos sin ubicar">
            {cobertura.map((entrada) => (
              <li key={entrada.id} className={FILA}>
                <Link
                  href={entrada.href}
                  aria-label={`${etiquetaDeRecurso(entrada.recurso)}: ${entrada.etiqueta}`}
                  className={CLASES_DE_ENLACE}
                >
                  {entrada.etiqueta}
                </Link>
                <span className="text-[13px] text-caliza-apagada">
                  {razonDe(entrada.razon, entrada.calle)}
                </span>
                <span className="ml-auto text-[13px] text-caliza-apagada">
                  Abrir para ubicarlo
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
