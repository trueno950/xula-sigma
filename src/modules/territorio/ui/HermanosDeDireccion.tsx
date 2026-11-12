import { calleYNumero, type DomicilioId, type LugarId } from "../domain";
import { rutaDe } from "./contenido";

type Props = {
  raizId: LugarId;
  /** Lo minimo para dibujar y enlazar: el nodo del subarbol lo tiene. */
  hermanos: readonly {
    id: DomicilioId;
    lugarId: LugarId;
    calle: string;
    numero: string | null;
  }[];
  /** La ficha desde la que se entro; ver `contenido.ts` (`PropsDeContenido`). */
  regreso?: string | undefined;
};

/**
 * Las otras direcciones vivas con la misma calle y numero, cada una a su
 * propio panel: un hermano puede colgar de otro lugar del subarbol -otra
 * colonia- y enlazarlo con el nodo abierto lo manda a un domicilio que ese
 * panel no reconoce como suyo. `regreso` viaja en cada enlace, como en
 * `rutaDe`: saltar de hermano no pierde la ficha desde la que se entro.
 */
export function HermanosDeDireccion({ raizId, hermanos, regreso }: Props) {
  if (hermanos.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      <p className="text-[15px] text-caliza-apagada">
        {`Hay ${hermanos.length} ${
          hermanos.length === 1 ? "domicilio más" : "domicilios más"
        } en esta dirección.`}
      </p>
      <ul className="flex flex-col gap-1">
        {hermanos.map((hermano) => (
          <li key={hermano.id}>
            <a
              href={rutaDe({
                raizId,
                nodoId: hermano.lugarId,
                vista: "domicilios",
                domicilioId: hermano.id,
                regreso,
              })}
              className="text-[15px] text-marca underline underline-offset-2"
            >
              {calleYNumero(hermano)}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
