import { motul } from "@/shared/tenancy/municipiosDePrueba";
import { withTenant } from "@/shared/tenancy/withTenant";
import { comoZonaId, type LugarId } from "./domain";
import { zonas } from "./infrastructure/esquemaDeZonas";

/** Zona activa de un asentamiento (precedente `lugarDePrueba.crearCalle`). */
export const crearZona = (lugarId: LugarId, nombre: string) =>
  withTenant(motul, async (tx) => {
    const [fila] = await tx
      .insert(zonas)
      .values({ ayuntamientoId: motul, lugarId, nombre })
      .returning({ id: zonas.id });
    if (!fila) throw new Error("La insercion de prueba no devolvio una fila");
    return comoZonaId(fila.id);
  });
