export type PartesDelNombre = {
  nombres: string;
  primerApellido: string;
  segundoApellido: string | null;
};

/** Nombres primero: es como se lee en un documento o en un panel. */
export const nombreCompletoDe = (persona: PartesDelNombre): string =>
  [persona.nombres, persona.primerApellido, persona.segundoApellido]
    .filter((parte): parte is string => Boolean(parte))
    .join(" ");
