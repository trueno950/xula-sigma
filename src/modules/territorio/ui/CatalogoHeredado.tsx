import {
  CeldaDeDato,
  CeldaPrincipal,
  EnlaceDeAccion,
  FilaDeTabla,
  Tabla,
} from "@/shared/ui";
import type { CalleGuardada, LugarGuardado } from "../application/puertos";
import type { LugarId } from "../domain";
import { rutaDe } from "./contenido";
import { BarraDeAcciones } from "./PanelDeAccion";
import { type PermisosDeTerritorio, puedeAbrir } from "./permisos";
import { COLUMNAS_DE_CALLES, formatoDePunto } from "./vistaDeCalles";

type Props = {
  raizId: LugarId;
  calles: readonly Pick<CalleGuardada, "id" | "nombre" | "punto">[];
  lugares: readonly Pick<LugarGuardado, "id" | "nombre" | "tipo">[];
  permisos: PermisosDeTerritorio;
};

export function CatalogoHeredado({ raizId, calles, lugares, permisos }: Props) {
  const asentamiento =
    lugares.find((lugar) => lugar.id === raizId)?.nombre ?? "su asentamiento";

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[15px] text-caliza-apagada">
        {`Este lugar usa el catalogo de calles de ${asentamiento}.`}
      </p>

      {calles.length > 0 ? (
        <Tabla
          etiqueta={`Calles de ${asentamiento}`}
          columnas={COLUMNAS_DE_CALLES}
        >
          {/* Sin href: el panel de la calle se abre desde el asentamiento. */}
          {calles.map((calle) => (
            <FilaDeTabla key={calle.id}>
              <CeldaPrincipal>{calle.nombre}</CeldaPrincipal>
              <CeldaDeDato>{formatoDePunto(calle.punto)}</CeldaDeDato>
            </FilaDeTabla>
          ))}
        </Tabla>
      ) : (
        <p className="py-6 text-[15px] text-caliza-apagada">
          Todavia no hay calles cargadas en el catalogo del asentamiento.
        </p>
      )}

      {puedeAbrir("calle", permisos) ? (
        <BarraDeAcciones>
          <EnlaceDeAccion
            href={rutaDe({
              raizId: raizId,
              nodoId: raizId,
              vista: "calles",
              accion: "calle",
            })}
            variante="primaria"
          >
            Administrar el catalogo
          </EnlaceDeAccion>
        </BarraDeAcciones>
      ) : null}
    </div>
  );
}
