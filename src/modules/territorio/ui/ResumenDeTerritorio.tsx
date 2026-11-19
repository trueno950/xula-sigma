type Props = {
  /** Los asentamientos del municipio: las raices del arbol de la entrada. */
  asentamientos: number;
  /** Los domicilios de todo el municipio, ya contados por la pagina. */
  domicilios: number;
  /** `?q=`: lo que se esta buscando, si se esta buscando. */
  busqueda?: string | undefined;
  /** Cuantos lugares coincidieron con `?q=`, contando toda la jerarquia. */
  encontrados?: number | undefined;
};

const plural = (total: number, uno: string, varios: string) =>
  `${total} ${total === 1 ? uno : varios}`;

const NUMERO = "font-mono font-semibold tabular-nums";

/**
 * La linea de resultado de la entrada de `/territorio` (I2 de
 * `odd/tasks/territorio-ux.md`, S2): cuantos asentamientos y domicilios hay,
 * o cuantos lugares coincidieron al buscar. Es el patron de
 * `padron/ui/ResumenDeListado.tsx` con las palabras de este modulo: el
 * numero en mono tabular y el resto en tinta, nunca una frase que haya que
 * deducir.
 *
 * El chip de la busqueda no se repite aca: vive en `BuscadorDeLugares`, que
 * es quien la aplica, y dos "x" para el mismo filtro se leen como dos.
 */
export function ResumenDeTerritorio({
  asentamientos,
  domicilios,
  busqueda,
  encontrados,
}: Props) {
  if (busqueda) {
    return (
      <p className="text-[15px] text-caliza-tinta">
        <span className={NUMERO}>
          {plural(encontrados ?? 0, "lugar", "lugares")}
        </span>
        {` para «${busqueda}»`}
      </p>
    );
  }

  return (
    <p className="text-[15px] text-caliza-tinta">
      <span className={NUMERO}>
        {plural(asentamientos, "asentamiento", "asentamientos")}
      </span>
      <span className="text-caliza-apagada">
        {` · ${plural(domicilios, "domicilio", "domicilios")}`}
      </span>
    </p>
  );
}
