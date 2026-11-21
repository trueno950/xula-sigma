import { UserList } from "@phosphor-icons/react/ssr";
import { CLASES_DE_DATO } from "@/shared/ui";

/**
 * El aviso de S10, arriba de todo y antes de que la operadora lea un solo
 * conteo: el ZIP no lleva solo datos del municipio, lleva la cuenta y la
 * actividad del personal.
 *
 * No es un `Aviso` de `shared/ui` porque ese recibe texto y aca los dos
 * nombres de archivo van en mono, que es como se nombran los archivos en el
 * resto del inventario.
 */
export function AvisoDeDatosDelPersonal() {
  return (
    <div
      role="status"
      className="flex items-start gap-2.5 rounded-md bg-senial-aviso-suave px-3 py-2.5"
    >
      <UserList
        size={20}
        weight="fill"
        aria-hidden="true"
        className="mt-px shrink-0 text-senial-aviso"
      />
      <div className="flex flex-col gap-1 text-[15px] leading-[1.5]">
        <p className="font-medium text-caliza-tinta">
          El archivo lleva datos del personal del ayuntamiento.
        </p>
        <p className="text-caliza-tinta">
          <code className={CLASES_DE_DATO}>usuarios.csv</code> tiene el nombre,
          el correo y el rol de cada cuenta, y{" "}
          <code className={CLASES_DE_DATO}>bitacora.csv</code> tiene quién hizo
          qué y cuándo. Compártalo solo con quien deba verlo.
        </p>
        <p className="text-[13px] text-caliza-apagada">
          El ZIP va completo: los dos conjuntos no se pueden quitar de la
          descarga.
        </p>
      </div>
    </div>
  );
}
