"use server";

import { z } from "zod";
import { contextoActual } from "@/shared/auth";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { sugerirDuplicados } from "../../composicion";
import type { PersonaId } from "../../domain";

const esquemaDeEntrada = z.string().trim().min(1).max(200);

/**
 * Forma reducida de `PersonaGuardada` para el cliente: sin `curp` ni
 * `bajaEn`. La sugerencia solo necesita el nombre para que la operadora
 * reconozca a la persona — CURP es dato personal, y esta accion ya cruza
 * al bundle del cliente.
 */
export type SugerenciaDeDuplicado = {
  id: PersonaId;
  nombres: string;
  primerApellido: string;
  segundoApellido: string | null;
};

/**
 * Invocada directamente desde `SugerenciaDeDuplicados` (`"use client"`),
 * no desde un `<form action>`: por eso devuelve datos en vez de `void`,
 * distinto contrato al de `altaDePersonaAction`. Es superficie publica
 * igual que un `<form action>` -recibe lo que el cliente quiera mandarle-,
 * asi que valida con Zod en la primera linea igual que las demas.
 *
 * Nunca propaga: esta accion no tiene errores de negocio que redactar
 * para la operadora -sin rol que exigir, sin escritura que pueda
 * rechazarse-, asi que una caida real de infraestructura (`withTenant`,
 * Postgres abajo) se registra en el log del servidor y devuelve lista
 * vacia, mismo criterio "nunca bloqueante" del spec para la sugerencia.
 */
export async function sugerirDuplicadosAction(
  cadena: string,
): Promise<readonly SugerenciaDeDuplicado[]> {
  const analisis = esquemaDeEntrada.safeParse(cadena);
  if (!analisis.success) return [];

  const contexto = await contextoActual();
  if (!contexto) return [];

  try {
    const encontradas = await sugerirDuplicados(analisis.data, contexto);

    return encontradas.map(
      ({ id, nombres, primerApellido, segundoApellido }) => ({
        id,
        nombres,
        primerApellido,
        segundoApellido,
      }),
    );
  } catch (error) {
    console.error(
      "[padron] sugerencia de duplicados fallo",
      datosSegurosDeError(error),
    );

    return [];
  }
}
