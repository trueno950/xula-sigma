import type { DomicilioId, LugarId } from "../domain";
import { rutaDe } from "./contenido";
import { direccionDe } from "./vistaDeDomicilios";

type Props = {
  raizId: LugarId;
  nodoId: LugarId;
  /** Lo minimo para dibujar y enlazar: el nodo del subarbol lo tiene. */
  hermanos: readonly {
    id: DomicilioId;
    calle: string;
    numero: string | null;
  }[];
};

/** Las otras direcciones vivas con la misma calle y numero, cada una a su panel. */
export function HermanosDeDireccion({ raizId, nodoId, hermanos }: Props) {
  if (hermanos.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      <p className="text-[15px] text-caliza-apagada">
        {`Hay ${hermanos.length} ${
          hermanos.length === 1 ? "domicilio mas" : "domicilios mas"
        } en esta direccion.`}
      </p>
      <ul className="flex flex-col gap-1">
        {hermanos.map((hermano) => (
          <li key={hermano.id}>
            <a
              href={rutaDe({
                raizId,
                nodoId,
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
