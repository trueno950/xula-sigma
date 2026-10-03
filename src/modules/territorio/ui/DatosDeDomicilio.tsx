import Link from "next/link";
import { CLASES_DE_ENLACE, CLASES_DE_ETIQUETA } from "@/shared/ui";
import type {
  CalleGuardada,
  LugarGuardado,
  NodoDeSubarbol,
} from "../application/puertos";
import type { DomicilioGuardado } from "../application/puertosDeDomicilios";
import type { CalleId, LugarId } from "../domain";
import { rutaDe } from "./contenido";
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
  const delSubarbol = lugaresDeNodos(nodos);
  const lugar =
    delSubarbol.find((posible) => posible.id === domicilio.lugarId) ??
    lugares.find((posible) => posible.id === domicilio.lugarId);
  const asentamiento = lugares.find((posible) => posible.id === raizId);
  const zona = lugar
    ? etiquetaDeCamino(
        lugar.nombre,
        caminoDeLugar(
          delSubarbol,
          domicilio.lugarId,
          asentamiento
            ? { id: raizId, nombre: asentamiento.nombre }
            : undefined,
        ),
      )
    : undefined;

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <h3 className="break-words text-[1.25rem] leading-[1.3] font-semibold tracking-[-0.01em] text-caliza-tinta">
        {direccionDe(calle, domicilio.numero)}
      </h3>
      {zona ? (
        <p className={CLASES_DE_ETIQUETA}>
          {"Lugar: "}
          <Link
            href={rutaDe({
              raizId,
              nodoId: domicilio.lugarId,
              vista: "lugares",
            })}
            className={CLASES_DE_ENLACE}
          >
            {zona}
          </Link>
        </p>
      ) : null}
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
    </div>
  );
}
