import type { PorcionExportable } from "@/shared/exportacion/exportar";
import {
  calles,
  callesDeZonas,
  domicilios,
  eventosDeCalles,
  lugares,
  residencias,
  zonas,
} from "./infrastructure/esquema";

/**
 * Lo que `territorio` aporta al exportador de plataforma (design.md seccion
 * 10; `zonas`, `calles_de_zonas` y `eventos_de_calles` entran con S2 de
 * `odd/tasks/exportacion-de-datos.md`). Vive en su propio archivo porque
 * `composicion.ts` ronda su metrica de 200 lineas; ese archivo reexporta,
 * asi que nadie cambia de import.
 *
 * Porciones planas, no vistas compuestas "calle con su zona" ni "domicilio
 * con residentes" (design.md seccion 10): un join denormalizado pierde filas -un domicilio sin residentes desaparece de un inner join, y
 * una casa deshabitada es un registro valido-. Columnas explicitas, nunca
 * `select()` pelado, mismo criterio que `porcionDePadron`. Sin
 * `ayuntamientoId`: redundante, ya lo sabe quien pide la exportacion.
 * `residencias.personaId` viaja crudo -es un uuid, el conjunto `personas`
 * ya va en el mismo archivo, y esconderlo dejaria un historial que no se
 * puede leer-. Sin guarda de rol nueva: `puedeExportar` ya cierra la
 * exportacion entera aguas arriba, en `exportarAyuntamiento`.
 *
 * `calles_de_zonas` no lleva `id` porque la tabla no lo tiene: su identidad
 * es la pareja zona/calle, y `lugarId` viaja para que la fila se pueda unir
 * a `zonas` y a `calles` sin pasar por el sistema. `eventos_de_calles` sale
 * entera -las dos columnas de payload incluidas- porque el antes de un
 * cambio no se puede reconstruir despues: el punto anterior de una calle no
 * existe en ninguna otra fila.
 */
export const porcionesDeTerritorio: readonly PorcionExportable[] = [
  {
    nombre: "lugares",
    leer: (tx) =>
      tx
        .select({
          id: lugares.id,
          tipo: lugares.tipo,
          nombre: lugares.nombre,
          padreId: lugares.padreId,
          bajaEn: lugares.bajaEn,
          creadoEn: lugares.creadoEn,
          actualizadoEn: lugares.actualizadoEn,
        })
        .from(lugares),
  },
  {
    nombre: "calles",
    leer: (tx) =>
      tx
        .select({
          id: calles.id,
          nombre: calles.nombre,
          lugarId: calles.lugarId,
          latitud: calles.latitud,
          longitud: calles.longitud,
          bajaEn: calles.bajaEn,
          creadoEn: calles.creadoEn,
          actualizadoEn: calles.actualizadoEn,
        })
        .from(calles),
  },
  {
    nombre: "domicilios",
    leer: (tx) =>
      tx
        .select({
          id: domicilios.id,
          lugarId: domicilios.lugarId,
          calleId: domicilios.calleId,
          numero: domicilios.numero,
          entreCalleAId: domicilios.entreCalleAId,
          entreCalleBId: domicilios.entreCalleBId,
          referencia: domicilios.referencia,
          bajaEn: domicilios.bajaEn,
          creadoEn: domicilios.creadoEn,
          actualizadoEn: domicilios.actualizadoEn,
        })
        .from(domicilios),
  },
  {
    nombre: "residencias",
    leer: (tx) =>
      tx
        .select({
          id: residencias.id,
          personaId: residencias.personaId,
          domicilioId: residencias.domicilioId,
          desdeEn: residencias.desdeEn,
          hastaEn: residencias.hastaEn,
          creadoEn: residencias.creadoEn,
        })
        .from(residencias),
  },
  {
    nombre: "zonas",
    leer: (tx) =>
      tx
        .select({
          id: zonas.id,
          lugarId: zonas.lugarId,
          nombre: zonas.nombre,
          bajaEn: zonas.bajaEn,
          creadoEn: zonas.creadoEn,
          actualizadoEn: zonas.actualizadoEn,
        })
        .from(zonas),
  },
  {
    nombre: "calles_de_zonas",
    leer: (tx) =>
      tx
        .select({
          zonaId: callesDeZonas.zonaId,
          calleId: callesDeZonas.calleId,
          lugarId: callesDeZonas.lugarId,
          creadoEn: callesDeZonas.creadoEn,
        })
        .from(callesDeZonas),
  },
  {
    nombre: "eventos_de_calles",
    leer: (tx) =>
      tx
        .select({
          id: eventosDeCalles.id,
          calleId: eventosDeCalles.calleId,
          naturaleza: eventosDeCalles.naturaleza,
          ocurridoEn: eventosDeCalles.ocurridoEn,
          nombreAnterior: eventosDeCalles.nombreAnterior,
          nombreNuevo: eventosDeCalles.nombreNuevo,
          latitudAnterior: eventosDeCalles.latitudAnterior,
          longitudAnterior: eventosDeCalles.longitudAnterior,
          latitudNueva: eventosDeCalles.latitudNueva,
          longitudNueva: eventosDeCalles.longitudNueva,
          lugarAnteriorId: eventosDeCalles.lugarAnteriorId,
          lugarNuevoId: eventosDeCalles.lugarNuevoId,
        })
        .from(eventosDeCalles),
  },
];
