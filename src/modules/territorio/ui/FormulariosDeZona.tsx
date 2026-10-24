import { Boton } from "@/shared/ui";
import { clasesDeCampo } from "@/shared/ui/estilos";
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
    <form action={altaDeZonaAction} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-[13px] text-caliza-apagada">
        Asentamiento
        <select name="lugarId" required className={clasesDeCampo()}>
          {asentamientos.map((lugar) => (
            <option key={lugar.id} value={lugar.id}>
              {lugar.nombre}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[13px] text-caliza-apagada">
        Nombre de la zona
        <input
          name="nombre"
          required
          maxLength={80}
          className={clasesDeCampo()}
        />
      </label>
      <Boton type="submit" variante="primaria">
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
      className="flex flex-wrap items-end gap-3"
    >
      <input type="hidden" name="zonaId" value={zonaId} />
      <label className="flex flex-col gap-1 text-[13px] text-caliza-apagada">
        Nombre de la zona
        <input
          name="nombre"
          required
          maxLength={80}
          defaultValue={nombre}
          className={clasesDeCampo()}
        />
      </label>
      <Boton type="submit" variante="secundaria">
        Renombrar
      </Boton>
    </form>
  );
}

export function FormularioDeBajaDeZona({ zonaId }: { zonaId: ZonaId }) {
  return (
    <form action={darDeBajaZonaAction}>
      <input type="hidden" name="zonaId" value={zonaId} />
      <Boton type="submit" variante="peligro">
        Dar de baja la zona
      </Boton>
    </form>
  );
}

export function FormularioDeBajaDeZonaEnFila({ zonaId }: { zonaId: ZonaId }) {
  return (
    <form action={darDeBajaZonaAction}>
      <input type="hidden" name="zonaId" value={zonaId} />
      <button
        type="submit"
        className="text-[15px] text-caliza-apagada underline"
      >
        Dar de baja
      </button>
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
      className="flex flex-wrap items-end gap-3"
    >
      <input type="hidden" name="zonaId" value={zonaId} />
      <label className="flex flex-col gap-1 text-[13px] text-caliza-apagada">
        Calle del asentamiento
        <select name="calleId" required className={clasesDeCampo()}>
          {calles.map((calle) => (
            <option key={calle.id} value={calle.id}>
              {calle.nombre}
            </option>
          ))}
        </select>
      </label>
      <Boton type="submit" variante="secundaria">
        Agregar a la zona
      </Boton>
    </form>
  );
}

export function FormularioDeQuitarCalleDeZona({
  zonaId,
  calleId,
}: {
  zonaId: ZonaId;
  calleId: CalleId;
}) {
  return (
    <form action={quitarCalleDeZonaAction}>
      <input type="hidden" name="zonaId" value={zonaId} />
      <input type="hidden" name="calleId" value={calleId} />
      <button
        type="submit"
        className="text-[15px] text-caliza-apagada underline"
      >
        Quitar
      </button>
    </form>
  );
}
