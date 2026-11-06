import { fechaCivilCorta } from "@/shared/lib/fecha";
import { CLASES_DE_DATO, InsigniaDeEstado } from "@/shared/ui";
import type { ResidenciaConDireccion } from "../application/historialDeResidencias";
import { vigenteDe } from "../domain";

type Props = {
  historial: readonly ResidenciaConDireccion[];
};

/**
 * Solo lectura (tasks.md 6.22). La "vigente" es la que resuelve `vigenteDe`
 * -primera fila con `hastaEn` null en el orden que ya trae
 * `historialDeResidencias` (`desdeEn DESC, creadoEn DESC`), ninguna
 * escritura la reconcilia (design.md seccion 8)-, no cualquier fila
 * abierta: una identidad fusionada puede traer dos residencias abiertas a
 * la vez -la propia y la de quien se le fusiono- y solo la mas reciente es
 * la vigente. Antes esta UI recalculaba el mismo desempate a mano con
 * `findIndex`; adopta `vigenteDe` en la misma rebanada que la funcion nace
 * (design.md seccion 7, pago concreto de la decision 16 de `proposal.md`).
 */
export function HistorialDeResidencias({ historial }: Props) {
  if (historial.length === 0) {
    return (
      <p className="text-[15px] text-caliza-apagada">
        Sin residencias registradas.
      </p>
    );
  }

  const vigente = vigenteDe(historial);

  return (
    <ul className="divide-y divide-caliza-divisor overflow-clip rounded-lg border border-caliza-divisor bg-caliza-lienzo shadow-reposo">
      {historial.map((residencia) => (
        <li key={residencia.id} className="flex flex-col gap-1 px-5 py-3">
          <span className="flex flex-wrap items-center gap-2 text-[15px] text-caliza-tinta">
            {residencia.texto ?? "Dirección no disponible"}
            {residencia === vigente ? (
              <InsigniaDeEstado tono="exito" etiqueta="Vigente" />
            ) : null}
          </span>
          <span className={CLASES_DE_DATO}>
            Desde {fechaCivilCorta(residencia.desdeEn)}
            {residencia.hastaEn
              ? ` hasta ${fechaCivilCorta(residencia.hastaEn)}`
              : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}
