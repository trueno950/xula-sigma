import { RoadHorizon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import {
  ANILLO_DE_FOCO,
  CeldaDeDato,
  CeldaPrincipal,
  CLASES_DE_TARJETA,
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

const ENLACE = `rounded-sm text-caliza-tinta underline underline-offset-2 ${ANILLO_DE_FOCO}`;

export function CatalogoHeredado({ raizId, calles, lugares, permisos }: Props) {
  const asentamiento =
    lugares.find((lugar) => lugar.id === raizId)?.nombre ?? "su asentamiento";
  const hrefDelCatalogo = rutaDe({
    raizId,
    nodoId: raizId,
    vista: "calles",
  });
  const enlace = (
    <Link href={hrefDelCatalogo} className={ENLACE}>
      {asentamiento}
    </Link>
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[15px] text-caliza-apagada">
        Este lugar usa el catálogo de calles de {enlace}.
      </p>

      {puedeAbrir("calle", permisos) ? (
        <BarraDeAcciones>
          <EnlaceDeAccion
            href={rutaDe({
              raizId,
              nodoId: raizId,
              vista: "calles",
              accion: "calle",
            })}
            variante="secundaria"
          >
            Administrar el catálogo
          </EnlaceDeAccion>
        </BarraDeAcciones>
      ) : null}

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
        <p
          className={`${CLASES_DE_TARJETA} flex items-start gap-2 text-[15px] text-caliza-apagada`}
        >
          <RoadHorizon
            size={20}
            weight="regular"
            aria-hidden="true"
            className="mt-0.5 shrink-0"
          />
          <span>El catálogo de {enlace} aún no tiene calles.</span>
        </p>
      )}
    </div>
  );
}
