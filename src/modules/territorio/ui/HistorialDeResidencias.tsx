import { CLASES_DE_DATO } from "@/shared/ui";
import type { ResidenciaGuardada } from "../application/puertosDeResidencias";
import { vigenteDe } from "../domain";

type Props = {
  historial: readonly ResidenciaGuardada[];
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
        <li key={residencia.id} className="flex flex-col gap-0.5 px-5 py-3">
          <span className="text-[15px] text-caliza-tinta">
            {residencia.domicilio.numero
              ? `Número ${residencia.domicilio.numero}`
              : "Sin número"}
            {residencia === vigente ? " · Vigente" : ""}
          </span>
          <span className={CLASES_DE_DATO}>
            Desde {residencia.desdeEn}
            {residencia.hastaEn ? ` hasta ${residencia.hastaEn}` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}
