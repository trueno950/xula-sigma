import type { PersonaGuardada } from "../application/puertos";

type Props = {
  /** Ya filtradas: `bajaEn` no nulo se excluye del lado del repositorio. */
  personas: readonly PersonaGuardada[];
};

/**
 * Sin calculo de negocio (`DESIGN.md`, Tablas): recibe los datos ya
 * resueltos. Es una lista de `<li>` en flex y no un `<table>` porque por
 * debajo de 640px la misma fila se reordena en dos renglones -- apellido y
 * nombre arriba, CURP abajo -- y esa reflexion no tiene equivalente limpio
 * con marcado de tabla. Sin scroll horizontal en ningun ancho.
 */
export function ListadoDePersonas({ personas }: Props) {
  if (personas.length === 0) {
    return (
      <p className="text-[15px] text-caliza-apagada">
        Todavia no hay personas en el padron.
      </p>
    );
  }

  return (
    <ul className="flex flex-col">
      {personas.map((persona) => (
        <li
          key={persona.id}
          className="flex min-h-11 flex-col justify-center gap-0.5 border-b border-caliza-divisor px-3 py-2 sm:h-11 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-0"
        >
          <span className="text-[15px] font-medium text-caliza-tinta">
            {persona.primerApellido}
            {persona.segundoApellido ? ` ${persona.segundoApellido}` : ""},{" "}
            {persona.nombres}
          </span>
          {persona.curp ? (
            <span className="font-mono text-[14px] text-caliza-apagada tabular-nums">
              {persona.curp}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
