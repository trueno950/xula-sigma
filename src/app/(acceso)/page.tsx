import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { listarReportes } from "@/modules/reportes";
import { contextoActual } from "@/shared/auth";
import { horaEnMerida } from "@/shared/lib/fecha";
import { leerMarca } from "@/shared/marca";
import { ayuntamientoActual } from "@/shared/tenancy/contexto";
import { BotonDeCerrarSesion } from "@/shared/ui/BotonDeCerrarSesion";
import { etiquetaDeRol } from "@/shared/ui/etiquetaDeRol";
import { InicioDeModulos } from "./InicioDeModulos";
import { PendientesDeHoy } from "./PendientesDeHoy";
import { saludoDeLaHora } from "./saludo";

export const metadata: Metadata = { title: "Inicio" };

/**
 * Adonde se llega despues de entrar: saludo, pendientes y modulos.
 *
 * Existe por dos motivos concretos y no de relleno: el acceso necesita un
 * destino, y el E2E necesita algo que solo se vea con sesion para probar
 * que la cookie de Motul no sirve en Ticul.
 *
 * **La verificacion es de servidor.** Sin sesion se redirige a `/acceso`
 * antes de renderizar nada; esconder contenido en el cliente no es
 * autorizacion (`05-seguridad.md` seccion 6).
 *
 * El saludo sigue la hora de `America/Merida`; la sesion trae el rol pero no
 * el nombre de la persona, asi que no se saluda por nombre.
 */
export default async function PaginaDeInicio() {
  const contexto = await contextoActual();

  if (!contexto) redirect("/acceso");

  const ayuntamiento = await ayuntamientoActual();
  const { escudo } = leerMarca(ayuntamiento.marca);
  const recibidos = await listarReportes({ estado: "RECIBIDO" }, contexto);

  return (
    <main className="flex min-h-dvh flex-col">
      <header className="bg-marca-tenue">
        <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-6 md:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            {escudo ? (
              // biome-ignore lint/performance/noImgElement: host externo por municipio
              <img
                src={escudo}
                alt={`Escudo de ${ayuntamiento.nombre}`}
                className="h-14 w-14 shrink-0 object-contain"
              />
            ) : null}
            <div className="flex min-w-0 flex-col gap-1">
              <h1 className="text-[1.75rem] leading-[1.15] font-[650] tracking-[-0.02em] text-caliza-tinta">
                {saludoDeLaHora(horaEnMerida(new Date()))}
              </h1>
              <p className="text-[15px] text-caliza-apagada">
                {ayuntamiento.nombre} · {etiquetaDeRol(contexto.usuario.rol)}
              </p>
            </div>
          </div>
          <BotonDeCerrarSesion />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-8 md:px-6 lg:px-8">
        <PendientesDeHoy
          reportes={recibidos.reportes.length}
          hayMasReportes={recibidos.hayMas}
        />
        <InicioDeModulos rol={contexto.usuario.rol} />
      </div>
    </main>
  );
}
