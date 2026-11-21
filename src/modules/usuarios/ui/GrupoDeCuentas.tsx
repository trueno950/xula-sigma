import type { Rol } from "@/shared/auth/roles";
import type { GrupoDelListado } from "./agrupacionDelListado";
import { permisosDelRol, tituloDelRol } from "./descripcionesDeRol";
import { FilaDeCuenta } from "./FilaDeCuenta";
import { permisosDeCuenta } from "./permisosDeCuenta";
import { pluralizar } from "./pluralizar";

/**
 * Un bloque por rol (S4 de `usuarios-ux`): que permite ese rol, cuantas
 * cuentas activas lo tienen y quienes son. Es la pregunta que trae quien
 * administra —«quien puede capturar»— contestada sin leer una columna.
 *
 * El encabezado es el nombre accesible del grupo: el rol viaja ahi y no
 * repetido en cada fila (S3).
 */

/** La tarjeta que envuelve la lista: las filas se separan con el divisor. */
const CLASES_DE_LISTA =
  "overflow-clip rounded-lg border border-caliza-divisor bg-caliza-lienzo " +
  "shadow-reposo [&>li+li]:border-t [&>li+li]:border-caliza-divisor";

export function GrupoDeCuentas({
  grupo,
  actor,
}: {
  grupo: GrupoDelListado;
  actor: { id: string; rol: Rol };
}) {
  const id = `grupo-${grupo.rol}`;

  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2
          id={id}
          className="text-[1.25rem] leading-[1.3] font-semibold tracking-[-0.01em] text-caliza-tinta"
        >
          {tituloDelRol(grupo.rol)}
        </h2>
        <span className="font-mono text-[13px] font-medium text-caliza-apagada">
          {pluralizar(grupo.cuentas.length, "cuenta activa", "cuentas activas")}
        </span>
      </div>
      <p className="max-w-[66ch] text-[13px] leading-[1.4] text-caliza-apagada">
        {permisosDelRol(grupo.rol)}
      </p>
      <ul className={CLASES_DE_LISTA}>
        {grupo.cuentas.map((usuario) => (
          <FilaDeCuenta
            key={usuario.id}
            usuario={usuario}
            permisos={permisosDeCuenta(actor, usuario)}
            esSuCuenta={usuario.id === actor.id}
          />
        ))}
      </ul>
    </section>
  );
}
