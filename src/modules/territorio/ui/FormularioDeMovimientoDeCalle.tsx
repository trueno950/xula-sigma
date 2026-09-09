import { Boton, CampoDeLista } from "@/shared/ui";
import type { LugarGuardado } from "../application/puertos";
import { reparentearCalleAction } from "./actions/reparentearCalleAction";
import { opcionesDeLugares } from "./opciones";
import { type CalleParaPanel, destinosDeMovimiento } from "./vistaDeCalles";

type Props = {
  calle: CalleParaPanel;
  lugares: readonly Pick<LugarGuardado, "id" | "nombre" | "tipo">[];
};

export function FormularioDeMovimientoDeCalle({ calle, lugares }: Props) {
  const destinos = destinosDeMovimiento(calle.lugarId, lugares);

  return (
    <form action={reparentearCalleAction} className="flex flex-col gap-4">
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
