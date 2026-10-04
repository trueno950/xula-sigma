import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type ContextoActual, contextoActual } from "@/shared/auth";
import { type navegacionDe, volverAlArbol } from "./volverAlArbol";

/**
 * El tramo comun de las acciones de territorio una vez validado el formulario:
 * sesion, caso de uso y repintado. Una falla vuelve al arbol con su mensaje;
 * el exito lo redirige quien llama, porque el destino difiere por accion.
 */
export const ejecutarEnContexto = async (
  navegacion: ReturnType<typeof navegacionDe>,
  caso: (contexto: ContextoActual) => Promise<unknown>,
  mensajeDeError: (error: unknown) => string,
): Promise<void> => {
  const contexto = await contextoActual();

  if (!contexto) redirect("/acceso");

  try {
    await caso(contexto);
  } catch (error) {
    volverAlArbol(navegacion, mensajeDeError(error));
  }

  revalidatePath("/territorio");
};
