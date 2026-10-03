import { presentacionDeAviso } from "./estilos";

type Props = {
  tono: "error" | "exito" | "aviso";
  children: string;
};

/**
 * Un mensaje de estado con icono, nunca solo con color (`DESIGN.md`, Do's).
 *
 * La razon no es preferencia: la marca del municipio puede ser del mismo
 * tono que la senal, asi que el color no alcanza para distinguir un error
 * de un boton. El icono y la palabra si.
 *
 * `role="alert"` solo en el error: interrumpe la lectura del operador, y
 * eso se justifica cuando algo salio mal, no cuando salio bien.
 */
export function Aviso({ tono, children }: Props) {
  const { Icono, color, fondo, role } = presentacionDeAviso(tono);

  return (
    <p
      role={role}
      className={`flex items-start gap-2 rounded-md px-3 py-2 text-[15px] ${fondo} ${color}`}
    >
      <Icono size={20} weight="fill" className="mt-px shrink-0" />
      {children}
    </p>
  );
}
