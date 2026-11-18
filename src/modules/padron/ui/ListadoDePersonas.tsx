import type { ReactNode } from "react";
import {
  type ColumnaDeTabla,
  EstadoVacio,
  estadoDeLista,
  Tabla,
} from "@/shared/ui";
import type { PersonaGuardada } from "../application/puertos";
import type { OrdenDePersonas } from "../domain";
import { resolverOrdenDeColumnas } from "./columnasOrdenables";
import { FilaDePersona } from "./FilaDePersona";
import { hrefDeVerMas } from "./hrefsDeListado";
import { PieDeListado, ResumenDeListado } from "./ResumenDeListado";

type Props = {
  /** Ya filtradas: `bajaEn` no nulo se excluye del lado del repositorio. */
  personas: readonly PersonaGuardada[];
  /**
   * `personaId -> etiqueta de su domicilio vigente`, leida en lote por la
   * pagina (S1). Sin entrada es «Sin domicilio»: nunca se rellena con la
   * ultima direccion conocida.
   */
  domicilios?: ReadonlyMap<string, string> | undefined;
  /** El `?q=` que produjo esta lista, si lo hubo. Distingue los dos vacios. */
  filtro?: string | undefined;
  /** El boton que llena la pantalla cuando todavia no tiene a nadie. */
  accionDeAlta?: ReactNode;
  /** El `?ordenar=&direccion=` vigente, si el operador pidio uno. */
  orden?: OrdenDePersonas | undefined;
  /** El `?limite=` vigente -50 si no vino en la URL. */
  limite?: number | undefined;
  /** De `resolverPagina`: si hay una pagina siguiente que pintar. */
  hayMas?: boolean | undefined;
};

/**
 * Solo las columnas con orden natural pasan por el estado de
 * `@tanstack/table-core` (`design.md`, "Ordenamiento de columnas"): el
 * domicilio no se ordena porque el operador no tiene un orden del
 * territorio que pedir, y `resolverOrdenDeColumnas` solo conoce las que
 * declara, asi que se agrega despues de resolver el orden.
 */
const COLUMNAS_CON_ORDEN: readonly ColumnaDeTabla[] = [
  { clave: "persona", etiqueta: "Persona", ancho: "minmax(0,2fr)" },
  { clave: "curp", etiqueta: "CURP", ancho: "minmax(0,1.2fr)" },
];

const COLUMNA_DOMICILIO: ColumnaDeTabla = {
  clave: "domicilio",
  etiqueta: "Domicilio vigente",
  ancho: "minmax(0,1.8fr)",
};

/**
 * La accion primaria del listado en el telefono: debajo del buscador y
 * antes del conteo, que es el orden que fija S4. En escritorio la misma
 * accion vive en la cabecera de la pantalla, y por eso aca se oculta.
 */
const AltaEnTelefono = ({ accion }: { accion: ReactNode }) => (
  <div className="sm:hidden [&_a]:w-full">{accion}</div>
);

/**
 * El listado de `padron-ux` en la direccion de
 * `design/padron-listado/01-tabla-con-domicilio.html`: la linea de resultado
 * con la busqueda y su chip, la tabla con el domicilio vigente de cada
 * persona, y el pie con lo que se esta viendo.
 *
 * Los dos vacios siguen siendo distintos y por eso recibe `filtro` -ver
 * `shared/ui/estadoDeLista.ts`-. En el de busqueda sin resultados el alta
 * viaja con la lista, debajo del buscador, porque en el telefono la accion
 * de la cabecera esta oculta.
 */
export function ListadoDePersonas({
  personas,
  domicilios,
  filtro,
  accionDeAlta,
  orden,
  limite,
  hayMas,
}: Props) {
  const estado = estadoDeLista({ total: personas.length, filtro });
  const alta = accionDeAlta ? <AltaEnTelefono accion={accionDeAlta} /> : null;

  if (estado.clase === "vacio-inicial") {
    return (
      <EstadoVacio
        estado={estado}
        mensajeInicial="Todavía no hay personas en el padrón."
        hrefSinFiltro="/padron"
        {...(accionDeAlta ? { accion: accionDeAlta } : {})}
      />
    );
  }

  if (estado.clase === "vacio-por-filtro") {
    return (
      <div className="flex flex-col gap-4">
        {alta}
        <EstadoVacio
          estado={estado}
          mensajeInicial="Todavía no hay personas en el padrón."
          hrefSinFiltro="/padron"
        />
      </div>
    );
  }

  const columnas = [
    ...resolverOrdenDeColumnas(COLUMNAS_CON_ORDEN, { orden, filtro }),
    COLUMNA_DOMICILIO,
  ];

  return (
    <div className="flex flex-col gap-4">
      {alta}
      <ResumenDeListado total={personas.length} filtro={filtro} orden={orden} />
      <Tabla
        etiqueta="Personas del padrón"
        columnas={columnas}
        {...(hayMas ? { verMas: hrefDeVerMas({ filtro, limite, orden }) } : {})}
      >
        {personas.map((persona) => (
          <FilaDePersona
            key={persona.id}
            persona={persona}
            domicilio={domicilios?.get(persona.id)}
          />
        ))}
      </Tabla>
      <PieDeListado total={personas.length} hayMas={hayMas} />
    </div>
  );
}
