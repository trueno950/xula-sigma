/**
 * La mitad de marca tenue del acceso: el escudo grande y el nombre del
 * municipio (`DESIGN.md`, Acceso). En movil es una banda arriba del
 * formulario. Lleva el `h1` de la pantalla.
 */
export function PanelDeBienvenida({
  nombre,
  escudo,
}: {
  nombre: string;
  escudo?: string | undefined;
}) {
  return (
    <section className="flex flex-col items-center justify-center gap-4 bg-marca-tenue px-6 py-8 text-center min-[960px]:min-h-dvh min-[960px]:gap-6 min-[960px]:py-12">
      {escudo ? (
        // biome-ignore lint/performance/noImgElement: el escudo sale de R2
        // con dominio por municipio; `next/image` pediria declararlos todos
        // en la configuracion de build, y son datos, no configuracion.
        <img
          src={escudo}
          alt={`Escudo de ${nombre}`}
          className="h-24 w-24 object-contain min-[960px]:h-40 min-[960px]:w-40"
        />
      ) : null}
      <div className="flex max-w-[28ch] flex-col gap-2">
        <h1 className="text-[1.75rem] leading-[1.15] font-[650] tracking-[-0.02em] text-caliza-tinta">
          {nombre}
        </h1>
        <p className="text-[15px] text-caliza-tinta">
          Bienvenido a XULA SIGMA. Entre con su cuenta para continuar.
        </p>
      </div>
    </section>
  );
}
