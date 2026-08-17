import { redirect } from "next/navigation";
import { contextoActual } from "@/shared/auth";
import { ayuntamientoActual } from "@/shared/tenancy/contexto";

/**
 * Adonde se llega despues de entrar. Es un piso, no la aplicacion: los
 * modulos llegan con la fase 1.
 *
 * Existe por dos motivos concretos y no de relleno: el acceso necesita un
 * destino, y el E2E necesita algo que solo se vea con sesion para probar
 * que la cookie de Motul no sirve en Ticul.
 *
 * **La verificacion es de servidor.** Sin sesion se redirige a `/acceso`
 * antes de renderizar nada; esconder contenido en el cliente no es
 * autorizacion (`05-seguridad.md` seccion 6).
 */
export default async function PaginaDeInicio() {
  const contexto = await contextoActual();

  if (!contexto) redirect("/acceso");

  const ayuntamiento = await ayuntamientoActual();

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">{ayuntamiento.nombre}</h1>
      <p className="text-neutral-700">
        Sesion iniciada como <strong>{contexto.usuario.rol}</strong>.
      </p>
      <p className="text-sm text-neutral-500">
        Los modulos del sistema llegan en la proxima fase.
      </p>
    </main>
  );
}
