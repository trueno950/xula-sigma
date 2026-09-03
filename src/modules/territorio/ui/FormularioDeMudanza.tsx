import type { DomicilioParaListado } from "../application/puertosDeDomicilios";
import { registrarMudanzaAction } from "./actions/registrarMudanzaAction";

const CLASE_ETIQUETA = "text-[13px] font-medium text-caliza-apagada";
const CLASE_CAMPO =
  "h-11 rounded-sm border border-caliza-borde bg-caliza-lienzo px-3 text-[15px] text-caliza-tinta outline-none focus:border-marca focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-marca";

type Props = {
  personaId: string;
  domicilios: readonly DomicilioParaListado[];
};

/**
 * Server Component, `<form action={...}>` nativo sin `"use client"`
 * (tasks.md 6.22, mismo reparto que `FormularioDeDomicilio`). `domicilioId`
 * sale de un `<select>` del catalogo del municipio (`listarDomicilios`):
 * el ID crudo no aparece en ningun lado de la UI, asi que pedirlo escrito
 * era un callejon sin salida.
 */
export function FormularioDeMudanza({ personaId, domicilios }: Props) {
  return (
    <form action={registrarMudanzaAction} className="flex flex-col gap-3">
      <h2 className="text-[15px] font-medium text-caliza-tinta">
        Registrar mudanza
      </h2>
      <input type="hidden" name="personaId" value={personaId} />
      <label className="flex flex-col gap-1">
        <span className={CLASE_ETIQUETA}>Domicilio</span>
        <select name="domicilioId" required className={CLASE_CAMPO}>
          {domicilios.length === 0 ? (
            <option value="">Sin domicilios registrados en el municipio</option>
          ) : (
            <>
              <option value="" disabled>
                Elija un domicilio...
              </option>
              {domicilios.map((domicilio) => (
                <option key={domicilio.id} value={domicilio.id}>
                  {domicilio.lugar} — {domicilio.calle}{" "}
                  {domicilio.numero ?? "S/N"}
                </option>
              ))}
            </>
          )}
        </select>
        {domicilios.length === 0 ? (
          <span className="text-[12px] text-caliza-apagada">
            Primero cree un domicilio desde Territorio.
          </span>
        ) : null}
      </label>
      <button
        type="submit"
        className="h-11 rounded-sm bg-marca px-4 text-[15px] font-medium text-marca-texto"
      >
        Registrar mudanza
      </button>
    </form>
  );
}
