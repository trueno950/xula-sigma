import { MinusCircle, Plus, Prohibit } from "@phosphor-icons/react/ssr";
import { Boton, Campo, CampoDeLista } from "@/shared/ui";
import type { LugarGuardado } from "../application/puertos";
import type { CalleId, ZonaId } from "../domain";
import { agregarCalleAZonaAction } from "./actions/agregarCalleAZonaAction";
import { altaDeZonaAction } from "./actions/altaDeZonaAction";
import { darDeBajaZonaAction } from "./actions/darDeBajaZonaAction";
import { quitarCalleDeZonaAction } from "./actions/quitarCalleDeZonaAction";
import { renombrarZonaAction } from "./actions/renombrarZonaAction";

/**
 * Los formularios de zonas son `<form action={...}>` nativos: envian sin
 * JavaScript de por medio y la accion responde con redirect. Por eso no
 * llevan `useActionState` ni `"use client"` (excepcion de AGENTS.md).
 */

export type CalleParaZona = { id: CalleId; nombre: string };

export function FormularioDeAltaDeZona({
  asentamientos,
}: {
  asentamientos: readonly LugarGuardado[];
}) {
  return (
    <form action={altaDeZonaAction} className="flex flex-col gap-6">
      <CampoDeLista
        id="zona-asentamiento"
        name="lugarId"
        etiqueta="Asentamiento"
        marcador="Elija el asentamiento"
        opciones={asentamientos.map((lugar) => ({
          valor: lugar.id,
          etiqueta: lugar.nombre,
        }))}
      />
      <Campo
        id="zona-nombre"
        name="nombre"
        etiqueta="Nombre de la zona"
        required
        maxLength={80}
      />
      <Boton type="submit" variante="primaria">
        <Plus size={18} aria-hidden />
        Crear zona
      </Boton>
    </form>
  );
}

export function FormularioDeRenombreDeZona({
  zonaId,
  nombre,
}: {
  zonaId: ZonaId;
  nombre: string;
}) {
  return (
    <form
      action={renombrarZonaAction}
      className="flex flex-col gap-4 sm:items-start"
    >
      <input type="hidden" name="zonaId" value={zonaId} />
      <Campo
        id="zona-renombre"
        name="nombre"
        etiqueta="Nombre de la zona"
        required
        maxLength={80}
        defaultValue={nombre}
      />
      <Boton type="submit" variante="secundaria">
        Guardar nombre
      </Boton>
    </form>
  );
}

export function FormularioDeBajaDeZona({
  zonaId,
  nombre,
}: {
  zonaId: ZonaId;
  nombre: string;
}) {
  return (
    <form
      action={darDeBajaZonaAction}
      className="flex flex-col gap-4 sm:items-start"
    >
      <input type="hidden" name="zonaId" value={zonaId} />
      <p className="text-[15px] text-caliza-tinta">
        La zona deja de aparecer en el listado y su nombre queda libre en el
        asentamiento. Las calles y sus domicilios no cambian.
      </p>
      <Boton type="submit" variante="peligro">
        <Prohibit size={18} aria-hidden />
        Dar de baja {nombre}
      </Boton>
    </form>
  );
}

export function FormularioDePertenenciaDeCalle({
  zonaId,
  calles,
}: {
  zonaId: ZonaId;
  calles: readonly CalleParaZona[];
}) {
  return (
    <form
      action={agregarCalleAZonaAction}
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <input type="hidden" name="zonaId" value={zonaId} />
      <div className="sm:w-80">
        <CampoDeLista
          id="zona-calle"
          name="calleId"
          etiqueta="Calle del asentamiento"
          marcador="Elija una calle"
          opciones={calles.map((calle) => ({
            valor: calle.id,
            etiqueta: calle.nombre,
          }))}
        />
      </div>
      <Boton type="submit" variante="secundaria">
        <Plus size={18} aria-hidden />
        Agregar a la zona
      </Boton>
    </form>
  );
}

export function FormularioDeQuitarCalleDeZona({
  zonaId,
  calle,
}: {
  zonaId: ZonaId;
  calle: CalleParaZona;
}) {
  return (
    <form action={quitarCalleDeZonaAction} className="sm:justify-self-end">
      <input type="hidden" name="zonaId" value={zonaId} />
      <input type="hidden" name="calleId" value={calle.id} />
      <Boton
        type="submit"
        variante="fantasma"
        aria-label={`Quitar ${calle.nombre} de la zona`}
      >
        <MinusCircle size={18} aria-hidden />
        Quitar
      </Boton>
    </form>
  );
}
