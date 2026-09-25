import Link from "next/link";
import { redirect } from "next/navigation";
import { contextoActual } from "@/shared/auth";
import { ayuntamientoActual } from "@/shared/tenancy/contexto";
import { BotonDeCerrarSesion } from "@/shared/ui/BotonDeCerrarSesion";
import { etiquetaDeRol } from "@/shared/ui/etiquetaDeRol";
import { MODULOS_DEL_PANEL } from "@/shared/ui/modulosDelPanel";

/**
 * Adonde se llega despues de entrar: el hub de modulos.
 *
 * Existe por dos motivos concretos y no de relleno: el acceso necesita un
 * destino, y el E2E necesita algo que solo se vea con sesion para probar
 * que la cookie de Motul no sirve en Ticul.
 *
 * **La verificacion es de servidor.** Sin sesion se redirige a `/acceso`
 * antes de renderizar nada; esconder contenido en el cliente no es
 * autorizacion (`05-seguridad.md` seccion 6).
 *
 * Los modulos salen de la misma lista que la navegacion del panel, con la
 * misma visibilidad: la que hay hoy no depende del rol, y si algun dia
 * depende, sera en ese unico lugar.
 */
export default async function PaginaDeInicio() {
  const contexto = await contextoActual();

  if (!contexto) redirect("/acceso");

  const ayuntamiento = await ayuntamientoActual();

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-caliza-tinta">
            {ayuntamiento.nombre}
          </h1>
          <p className="text-[15px] text-caliza-apagada">
            Sesión iniciada como{" "}
            <strong className="text-caliza-tinta">
              {etiquetaDeRol(contexto.usuario.rol)}
            </strong>
            .
          </p>
        </div>
        <BotonDeCerrarSesion />
      </div>
      <nav aria-label="Módulos" className="flex flex-col gap-3">
        {MODULOS_DEL_PANEL.map((modulo) => (
          <Link
            key={modulo.ruta}
            href={modulo.ruta}
            className="flex flex-col gap-0.5 rounded-sm border border-caliza-divisor bg-white p-4 transition-colors hover:border-marca"
          >
            <strong className="text-[15px] text-caliza-tinta">
              {modulo.nombre}
            </strong>
            <span className="text-sm text-caliza-apagada">
              {modulo.descripcion}
            </span>
          </Link>
        ))}
      </nav>
    </main>
  );
}
