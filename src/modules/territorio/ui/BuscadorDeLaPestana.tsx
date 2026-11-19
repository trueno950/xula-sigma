import { MagnifyingGlass } from "@phosphor-icons/react/ssr";
import {
  Aviso,
  Boton,
  ChipDeFiltro,
  CLASES_DE_ETIQUETA,
  clasesDeCampo,
} from "@/shared/ui";
import type { LugarId } from "../domain";
import { avisoDePalabrasIgnoradas } from "../domain/busquedaPorPalabras";
import { rutaDe } from "./contenido";

type Props = {
  raizId: LugarId;
  nodoId: LugarId;
  vista: "calles" | "domicilios";
  etiqueta: string;
  busqueda: string | undefined;
};

/**
 * El `?q=` de Calles y Domicilios: un GET resuelto en el servidor, sin
 * JavaScript. Un `<form method="get">` reemplaza la query entera, asi que
 * el lugar y la pestana viajan como campos ocultos; el `?limite=` no, y
 * una busqueda nueva vuelve a la primera pagina.
 *
 * Solo Domicilios tiene tope de palabras (`registroDeDomicilios`): ahi el
 * chip repite la consulta y debajo se avisa cuantas quedaron fuera. Calles
 * filtra por subcadena (`paginaDeCalles`), sin recorte que avisar, y su chip
 * vive en la linea de conteo -«2 calles para «20»»-, asi que pintarlo aca
 * tambien serian dos chips para el mismo filtro (S4 de
 * `odd/tasks/territorio-ux.md`).
 */
export function BuscadorDeLaPestana({
  raizId,
  nodoId,
  vista,
  etiqueta,
  busqueda,
}: Props) {
  const id = `buscar-en-${vista}`;
  const aviso =
    vista === "domicilios" && busqueda
      ? avisoDePalabrasIgnoradas(busqueda)
      : undefined;
  const chip = vista === "domicilios" && busqueda;

  return (
    <div className="flex flex-col gap-3">
      <form
        method="get"
        action="/territorio"
        className="flex flex-wrap items-end gap-3 max-sm:flex-col max-sm:items-stretch"
      >
        <input type="hidden" name="raiz" value={raizId} />
        <input type="hidden" name="nodo" value={nodoId} />
        <input type="hidden" name="vista" value={vista} />
        <div className="flex flex-col gap-1">
          <label htmlFor={id} className={CLASES_DE_ETIQUETA}>
            {etiqueta}
          </label>
          <div className="relative">
            <MagnifyingGlass
              size={18}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-caliza-apagada"
            />
            <input
              id={id}
              name="q"
              type="search"
              enterKeyHint="search"
              maxLength={100}
              defaultValue={busqueda}
              className={`${clasesDeCampo()} w-full pl-9 sm:w-64`}
            />
          </div>
        </div>
        <Boton type="submit" variante="secundaria">
          Buscar
        </Boton>
      </form>
      {chip ? (
        <ChipDeFiltro
          etiqueta={`Búsqueda: ${busqueda}`}
          hrefQuitar={rutaDe({ raizId, nodoId, vista })}
        />
      ) : null}
      {aviso ? <Aviso tono="aviso">{aviso}</Aviso> : null}
    </div>
  );
}
