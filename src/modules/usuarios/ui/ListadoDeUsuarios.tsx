import type { Rol } from "@/shared/auth/roles";
import type { UsuarioDelPanel } from "../domain";
import { agruparListado } from "./agrupacionDelListado";
import { GrupoDeCuentas } from "./GrupoDeCuentas";
import { ResumenDelListado } from "./ResumenDelListado";
import { SeccionDeBajas } from "./SeccionDeBajas";

/**
 * El listado del ayuntamiento agrupado por rol
 * (`design/usuarios-listado/02-agrupado-por-rol.html`, S2 a S5 de
 * `usuarios-ux`).
 *
 * **Quien esta de baja sigue apareciendo**, en su propia seccion al final y
 * con su fecha: la baja es logica y la fila no se borra (S6), asi que
 * esconderla dejaria a la operadora sin forma de saber que esa persona ya no
 * entra.
 *
 * **El orden y el conteo son de la pantalla, no de la consulta**: que se
 * agrupa por rol, que se cuenta y en que orden se muestran las bajas lo
 * decide `agrupacionDelListado`; el adaptador solo ordena por nombre para
 * que cada grupo se lea. Que se ofrece en cada fila lo decide
 * `permisosDeCuenta`, con las mismas reglas que corren en el servidor.
 */
export function ListadoDeUsuarios({
  usuarios,
  actor,
}: {
  usuarios: readonly UsuarioDelPanel[];
  actor: { id: string; rol: Rol };
}) {
  const resumen = agruparListado(usuarios);

  return (
    <div className="flex flex-col gap-6">
      <ResumenDelListado resumen={resumen} />
      <div className="flex flex-col gap-6">
        {resumen.grupos.map((grupo) => (
          <GrupoDeCuentas key={grupo.rol} grupo={grupo} actor={actor} />
        ))}
      </div>
      <SeccionDeBajas bajas={resumen.bajas} actor={actor} />
    </div>
  );
}
