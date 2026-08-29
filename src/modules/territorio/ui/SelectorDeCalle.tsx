import type { CalleGuardada } from "../application/puertos";

type Props = {
  name: string;
  /** `htmlFor` de la etiqueta que lo describe: biome no ve a traves del limite del componente, asi que la asociacion label/control no puede depender de anidamiento. */
  id: string;
  calles: readonly Pick<CalleGuardada, "id" | "nombre">[];
};

/**
 * `<select>` nativo poblado en servidor (tasks.md 4.10): la pagina ya
 * resolvio `calles` con `listarCalles`, este componente solo arma las
 * opciones. Reusable por cualquier formulario que necesite elegir una
 * calle existente -renombre en esta rebanada, domicilio en la 5-.
 */
export function SelectorDeCalle({ name, id, calles }: Props) {
  return (
    <select
      name={name}
      id={id}
      className="h-11 rounded-sm border border-caliza-borde bg-caliza-lienzo px-3 text-[15px] text-caliza-tinta outline-none focus:border-marca focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-marca"
      defaultValue=""
    >
      <option value="" disabled>
        Seleccione una calle
      </option>
      {calles.map((calle) => (
        <option key={calle.id} value={calle.id}>
          {calle.nombre}
        </option>
      ))}
    </select>
  );
}
