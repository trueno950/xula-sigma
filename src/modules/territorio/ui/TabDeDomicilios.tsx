import { AvisoDePermiso, CLASES_DE_ENLACE } from "@/shared/ui";
import { puedeTenerCatalogoDeCalles } from "../domain";
import { CatalogoHeredado } from "./CatalogoHeredado";
import { domiciliosDelSubarbolDe, type PropsDeContenido } from "./contenido";
import { ListaDeDomicilios } from "./ListaDeDomicilios";
import { PanelDeDomicilio } from "./PanelDeDomicilio";
import { puedeAbrir } from "./permisos";
import { salidaSinCalles, VacioDeDomicilios } from "./VacioDeDomicilios";

/**
 * Pestana Domicilios: los domicilios colgados del lugar, en maestro-detalle
 * como Calles. Cada fila abre el panel de su domicilio al lado (`lg`) o
 * debajo, sin estado de cliente.
 */
export function TabDeDomicilios({
  raizId,
  lugar,
  nodos,
  calles,
  lugares,
  domicilio,
  accion,
  permisos,
}: PropsDeContenido) {
  const puedeActuar = puedeAbrir("domicilio", permisos);
  const colgados = domiciliosDelSubarbolDe(nodos, lugar.id);
  const nombres = new Map<string, string>(
    nodos.flatMap((n) => (n.clase === "lugar" ? [[n.id, n.nombre]] : [])),
  );
  const sinCalles = calles.length === 0;
  const salida = salidaSinCalles(raizId, lugar);

  return (
    <div className="flex flex-col gap-4">
      {!puedeActuar ? (
        <AvisoDePermiso
          capacidad="registrar domicilios"
          requisito="un rol con permisos de escritura"
        />
      ) : null}

      {!puedeTenerCatalogoDeCalles(lugar.tipo) ? (
        <CatalogoHeredado raizId={raizId} lugares={lugares} />
      ) : null}

      {colgados.length === 0 ? (
        <VacioDeDomicilios
          raizId={raizId}
          lugar={lugar}
          sinCalles={sinCalles}
          puedeActuar={puedeActuar}
        />
      ) : (
        <div
          className={
            domicilio
              ? "grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start lg:gap-6"
              : "flex flex-col gap-4"
          }
        >
          <ListaDeDomicilios
            raizId={raizId}
            lugar={lugar}
            filas={colgados}
            nombreDeLugar={(lugarId) => nombres.get(lugarId) ?? lugar.nombre}
            domicilioId={domicilio?.id}
          />
          {domicilio ? (
            <PanelDeDomicilio
              raizId={raizId}
              nodoId={lugar.id}
              domicilio={domicilio}
              calles={calles}
              lugares={lugares}
              nodos={nodos}
              accion={accion}
              permisos={permisos}
            />
          ) : null}
        </div>
      )}

      {puedeActuar && sinCalles && colgados.length > 0 ? (
        <p className="text-[15px] text-caliza-apagada">
          {salida.texto}{" "}
          <a href={salida.href} className={CLASES_DE_ENLACE}>
            Agregar la primera
          </a>
          .
        </p>
      ) : null}
    </div>
  );
}
