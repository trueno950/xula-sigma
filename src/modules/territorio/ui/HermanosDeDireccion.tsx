import type { DomicilioId, LugarId } from "../domain";
import { rutaDe } from "./contenido";
import { direccionDe } from "./vistaDeDomicilios";

type Props = {
  raizId: LugarId;
  /** Lo minimo para dibujar y enlazar: el nodo del subarbol lo tiene. */
  hermanos: readonly {
    id: DomicilioId;
    lugarId: LugarId;
    calle: string;
    numero: string | null;
  }[];
};

/**
 * Las otras direcciones vivas con la misma calle y numero, cada una a su
 * propio panel: un hermano puede colgar de otro lugar del subarbol -otra
 * colonia, otra manzana- y enlazarlo con el nodo abierto lo manda a un
 * domicilio que ese panel no reconoce como suyo.
 */
export function HermanosDeDireccion({ raizId, hermanos }: Props) {
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
              })}
              className="text-[15px] text-marca underline underline-offset-2"
            >
              {direccionDe(hermano.calle, hermano.numero)}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
