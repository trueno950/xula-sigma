import type { CalleGuardada } from "../application/puertos";

type Props = {
  name: string;
  /** `htmlFor` de la etiqueta que lo describe: biome no ve a traves del limite del componente, asi que la asociacion label/control no puede depender de anidamiento. */
  id: string;
  calles: readonly Pick<CalleGuardada, "id" | "nombre">[];
  /** Las transversales de un domicilio son nullable a proposito (design.md decision 5): con esto el placeholder deja de estar deshabilitado y "ninguna" es una opcion real, no solo el estado inicial sin tocar. */
  opcional?: boolean;
};

/**
 * `<select>` nativo poblado en servidor (tasks.md 4.10): la pagina ya
 * resolvio `calles` con `listarCalles`, este componente solo arma las
 * opciones. Reusable por cualquier formulario que necesite elegir una
 * calle existente -renombre en la rebanada 4, calle y transversales del
 * domicilio en la 5-.
 */
export function SelectorDeCalle({ name, id, calles, opcional = false }: Props) {
  return (
    <select
      name={name}
      id={id}
      className="h-11 rounded-sm border border-caliza-borde bg-caliza-lienzo px-3 text-[15px] text-caliza-tinta outline-none focus:border-marca focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-marca"
      defaultValue=""
    >
      <option value="" disabled={!opcional}>
        {opcional ? "Ninguna" : "Seleccione una calle"}
      </option>
      {calles.map((calle) => (
        <option key={calle.id} value={calle.id}>
          {calle.nombre}
        </option>
      ))}
    </select>
  );
}
