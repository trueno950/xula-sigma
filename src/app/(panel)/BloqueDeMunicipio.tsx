import Link from "next/link";

/**
 * El escudo y el nombre del municipio: el primer lugar donde vive la marca
 * (`DESIGN.md`, seccion 2). Sobre marca tenue, que es un fondo y por eso no
 * lleva texto de marca: el nombre va en tinta.
 */
export function BloqueDeMunicipio({
  nombre,
  escudo,
}: {
  nombre: string;
  escudo?: string | undefined;
}) {
  return (
    <Link
      href="/"
      aria-label={`${nombre}, inicio`}
      className="flex min-h-16 items-center gap-3 bg-marca-tenue px-4 py-3 outline-offset-[-2px] focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-marca"
    >
      {escudo ? (
        // `next/image` exigiria declarar el host de R2 en `remotePatterns`, y
        // el escudo lo sube cada municipio a una URL que la plataforma no
        // elige. 40px de alto, sin recorte.
        // biome-ignore lint/performance/noImgElement: host externo por municipio
        <img
          src={escudo}
          alt=""
          className="h-10 w-10 shrink-0 object-contain"
        />
      ) : null}
      <span className="min-w-0 break-words text-[15px] font-semibold leading-tight text-caliza-tinta">
        {nombre}
      </span>
    </Link>
  );
}
