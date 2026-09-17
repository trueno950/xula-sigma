import type {
  CalleGuardada,
  LugarGuardado,
  NodoDeSubarbol,
} from "../application/puertos";
import type { DomicilioGuardado } from "../application/puertosDeDomicilios";
import type { CalleId, LugarId } from "../domain";
import {
  caminoDeLugar,
  direccionDe,
  etiquetaDeCamino,
  lugaresDeNodos,
} from "./vistaDeDomicilios";

type Props = {
  raizId: LugarId;
  domicilio: DomicilioGuardado;
  calles: readonly Pick<CalleGuardada, "id" | "nombre">[];
  lugares: readonly Pick<LugarGuardado, "id" | "nombre" | "tipo">[];
  nodos: readonly NodoDeSubarbol[];
};

export function DatosDeDomicilio({
  raizId,
  domicilio,
  calles,
  lugares,
  nodos,
}: Props) {
  const nombreDeCalle = (id: CalleId | null) =>
    id ? calles.find((calle) => calle.id === id)?.nombre : undefined;
  const calle = nombreDeCalle(domicilio.calleId) ?? "Calle desconocida";
  const transversales = [
    nombreDeCalle(domicilio.entreCalleAId),
    nombreDeCalle(domicilio.entreCalleBId),
  ].filter((nombre): nombre is string => Boolean(nombre));
  const lugar = lugares.find((posible) => posible.id === domicilio.lugarId);
  const asentamiento = lugares.find((posible) => posible.id === raizId);
  const zona = lugar
    ? etiquetaDeCamino(
        lugar.nombre,
        caminoDeLugar(
          lugaresDeNodos(nodos),
          domicilio.lugarId,
          asentamiento
            ? { id: raizId, nombre: asentamiento.nombre }
            : undefined,
        ),
      )
    : undefined;

  return (
    <div>
      <h3 className="text-[19px] font-semibold text-caliza-tinta">
        {direccionDe(calle, domicilio.numero)}
      </h3>
      {transversales.length > 0 ? (
        <p className="text-[15px] text-caliza-apagada">
          {`Entre ${transversales.join(" y ")}`}
        </p>
      ) : null}
      {domicilio.referencia ? (
        <p className="text-[15px] text-caliza-apagada">
          {`Referencia: ${domicilio.referencia}`}
        </p>
      ) : null}
      {zona ? (
        <p className="text-[15px] text-caliza-apagada">{`Zona: ${zona}`}</p>
      ) : null}
    </div>
  );
}
