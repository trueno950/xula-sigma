import { ChipDeFiltro, type OpcionDeLista } from "@/shared/ui";
import type { FiltrosDeRegistro } from "../application/puertosDeDomicilios";
import { filtrosVisiblesDeDomicilios } from "./filtrosVisiblesDeDomicilios";
import { hrefSinFiltroDeDomicilios } from "./hrefsDeDomicilios";

const ORDEN = "por asentamiento, calle y número";

const Cifra = ({ valor }: { valor: number }) => (
  <span className="font-mono font-semibold tabular-nums">{valor}</span>
);

const enPlural = (cuantos: number) =>
  cuantos === 1 ? "domicilio" : "domicilios";
type Props = {
  /** Las filas de la pagina: es lo unico que se sabe si la lectura no conto. */
  mostrados: number;
  /** Domicilios del municipio sin filtros. Ausente es «no hubo conteo». */
  total?: number | undefined;
  /** Domicilios que dejan los filtros puestos; llega junto con `total`. */
  coincidencias?: number | undefined;
  filtros: FiltrosDeRegistro;
  raices: readonly OpcionDeLista[];
};

/**
 * La cifra de S10: cuantas coinciden de cuantas hay, o cuantas hay cuando no
 * se busco nada. El total es el del municipio -lo devuelve el conteo del
 * registro, no la pagina-, y sin el se dice solo lo que la pagina trajo, sin
 * inventar un «de N» (`design/territorio-domicilios`, nota de S10).
 */
const cifras = ({
  total,
  coincidencias,
  mostrados,
  conFiltros,
}: Pick<Props, "total" | "coincidencias" | "mostrados"> & {
  conFiltros: boolean;
}) => {
  if (total === undefined || coincidencias === undefined) {
    return (
      <>
        <Cifra valor={mostrados} /> {enPlural(mostrados)}
      </>
    );
  }

  if (!conFiltros) {
    return (
      <>
        <Cifra valor={total} /> {enPlural(total)}{" "}
        {total === 1 ? "registrado" : "registrados"}
      </>
    );
  }

  return (
    <>
      <Cifra valor={coincidencias} /> de <Cifra valor={total} />{" "}
      {enPlural(total)}
    </>
  );
};

/**
 * La linea de resultado del registro plano: las cifras, la busqueda que las
 * produjo, con que orden llego la lista y un chip por cada filtro puesto.
 *
 * Los chips viven aca y no en `RegistroDeDomicilios` porque son la otra mitad
 * de la misma frase -«2 de 9 para «Calle 20»» y el chip que quita la
 * busqueda-, mismo corte que `padron/ui/ResumenDeListado` y
 * `constancias/ui/ResumenDeConstancias`.
 */
export function ResumenDeDomicilios({
  mostrados,
  total,
  coincidencias,
  filtros,
  raices,
}: Props) {
  const chips = filtrosVisiblesDeDomicilios(
    filtros,
    (id) => raices.find((raiz) => raiz.valor === id)?.etiqueta,
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-[15px] text-caliza-tinta">
        {cifras({
          total,
          coincidencias,
          mostrados,
          conFiltros: chips.length > 0,
        })}
        {filtros.busqueda ? ` para «${filtros.busqueda}»` : null}
        <span className="text-caliza-apagada">{` · ${ORDEN}`}</span>
      </p>
      {chips.length > 0 ? (
        <ul aria-label="Filtros aplicados" className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <li key={chip.clave}>
              <ChipDeFiltro
                etiqueta={chip.etiqueta}
                hrefQuitar={hrefSinFiltroDeDomicilios(filtros, chip.clave)}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** El pie de S10: cuanto se esta viendo de las coincidencias de la linea. */
export function PieDeDomicilios({
  mostrados,
  coincidencias,
}: {
  mostrados: number;
  coincidencias?: number | undefined;
}) {
  return (
    <p className="text-[13px] leading-tight text-caliza-apagada">
      Mostrando <span className="font-mono tabular-nums">1–{mostrados}</span>
      {coincidencias === undefined ? null : (
        <>
          {" de "}
          <span className="font-mono tabular-nums">{coincidencias}</span>
        </>
      )}{" "}
      {enPlural(coincidencias ?? mostrados)}
    </p>
  );
}
