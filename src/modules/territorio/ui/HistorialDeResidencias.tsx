import type { ResidenciaGuardada } from "../application/puertosDeResidencias";

type Props = {
  historial: readonly ResidenciaGuardada[];
};

/**
 * Solo lectura (tasks.md 6.22). La "vigente" es la **primera** fila con
 * `hastaEn` null en el orden que ya trae `historialDeResidencias`
 * (`desdeEn DESC, creadoEn DESC`) -ninguna escritura la reconcilia
 * (design.md seccion 8)-, no cualquier fila abierta: una identidad
 * fusionada puede traer dos residencias abiertas a la vez -la propia y la
 * de quien se le fusiono- y solo la mas reciente es la vigente (hallazgo
 * de GGA en la revision de esta rebanada, cubierto por el escenario
 * "residencias abiertas en ambas identidades" de
 * `historialDeResidencias.integration.test.ts`).
 */
export function HistorialDeResidencias({ historial }: Props) {
  if (historial.length === 0) {
    return (
      <p className="text-[15px] text-caliza-apagada">
        Sin residencias registradas.
      </p>
    );
  }

  const indiceVigente = historial.findIndex((r) => r.hastaEn === null);

  return (
    <ul className="flex flex-col gap-2">
      {historial.map((residencia, indice) => (
        <li
          key={residencia.id}
          className="flex flex-col gap-0.5 rounded-sm border border-caliza-borde p-3"
        >
          <span className="text-[15px] text-caliza-tinta">
            {residencia.domicilio.numero
              ? `Numero ${residencia.domicilio.numero}`
              : "Sin numero"}
            {indice === indiceVigente ? " · Vigente" : ""}
          </span>
          <span className="text-[13px] text-caliza-apagada">
            Desde {residencia.desdeEn}
            {residencia.hastaEn ? ` hasta ${residencia.hastaEn}` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}
