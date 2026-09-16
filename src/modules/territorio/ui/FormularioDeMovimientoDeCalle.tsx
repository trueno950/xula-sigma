import { Boton, CampoDeLista } from "@/shared/ui";
import type { LugarGuardado } from "../application/puertos";
import { reparentearCalleAction } from "./actions/reparentearCalleAction";
import { opcionesDeLugares } from "./opciones";
import { type CalleParaPanel, destinosDeMovimiento } from "./vistaDeCalles";

type Props = {
  raiz: string;
  nodo: string;
  calle: CalleParaPanel;
  lugares: readonly Pick<LugarGuardado, "id" | "nombre" | "tipo">[];
};

export function FormularioDeMovimientoDeCalle({
  raiz,
  nodo,
  calle,
  lugares,
}: Props) {
  const destinos = destinosDeMovimiento(calle.lugarId, lugares);

  return (
    <form action={reparentearCalleAction} className="flex flex-col gap-4">
      <input type="hidden" name="raiz" value={raiz} />
      <input type="hidden" name="nodo" value={nodo} />
      <input type="hidden" name="vista" value="calles" />
      <input type="hidden" name="accion" value="reparentearCalle" />
      <input type="hidden" name="calle" value={calle.id} />
      <input type="hidden" name="calleId" value={calle.id} />
      <CampoDeLista
        id="calle-nuevo-lugar-id"
        name="nuevoLugarId"
        etiqueta="Nuevo lugar"
        marcador="Seleccione donde va la calle"
        opciones={opcionesDeLugares(destinos)}
        ayuda="Los domicilios conservan su propio lugar y la ubicacion no cambia."
      />
      <Boton type="submit" variante="primaria">
        Mover calle
      </Boton>
    </form>
  );
}
