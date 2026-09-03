import type { ReactNode } from "react";
import {
  CeldaDeDato,
  CeldaPrincipal,
  type ColumnaDeTabla,
  EstadoVacio,
  estadoDeLista,
  FilaDeTabla,
  Tabla,
} from "@/shared/ui";
import type { PersonaGuardada } from "../application/puertos";

type Props = {
  /** Ya filtradas: `bajaEn` no nulo se excluye del lado del repositorio. */
  personas: readonly PersonaGuardada[];
  /** El `?q=` que produjo esta lista, si lo hubo. Distingue los dos vacios. */
  filtro?: string | undefined;
  /** El boton que llena la pantalla cuando todavia no tiene a nadie. */
  accionDeAlta?: ReactNode;
};

const COLUMNAS: readonly ColumnaDeTabla[] = [
  { clave: "persona", etiqueta: "Persona", ancho: "minmax(0,2fr)" },
  { clave: "curp", etiqueta: "CURP", ancho: "minmax(0,1fr)" },
];

/** Apellidos primero: es el orden en que se busca a alguien en un padron. */
const nombreDeLista = (persona: PersonaGuardada) =>
  `${persona.primerApellido}${
    persona.segundoApellido ? ` ${persona.segundoApellido}` : ""
  }, ${persona.nombres}`;

/**
 * Sin calculo de negocio (`DESIGN.md`, Tablas): recibe los datos ya
 * resueltos.
 *
 * Los dos vacios son distintos y por eso recibe `filtro`. Antes tenia uno
 * solo: `/padron?q=xyz` sin resultados respondia "Todavia no hay personas
 * en el padron", que es la pantalla que manda a dar de alta a alguien que
 * ya existe con el apellido escrito de otra forma. Es el unico error de
 * esta lista que le cuesta trabajo real a la operadora.
 */
export function ListadoDePersonas({ personas, filtro, accionDeAlta }: Props) {
  const estado = estadoDeLista({ total: personas.length, filtro });

  if (estado.clase !== "con-filas") {
    return (
      <EstadoVacio
        estado={estado}
        mensajeInicial="Todavia no hay personas en el padron."
        hrefSinFiltro="/padron"
        {...(accionDeAlta ? { accion: accionDeAlta } : {})}
      />
    );
  }

  return (
    <Tabla etiqueta="Personas del padron" columnas={COLUMNAS}>
      {personas.map((persona) => (
        <FilaDeTabla key={persona.id} href={`/padron/${persona.id}`}>
          <CeldaPrincipal>{nombreDeLista(persona)}</CeldaPrincipal>
          <CeldaDeDato>{persona.curp ?? "Sin CURP"}</CeldaDeDato>
        </FilaDeTabla>
      ))}
    </Tabla>
  );
}
