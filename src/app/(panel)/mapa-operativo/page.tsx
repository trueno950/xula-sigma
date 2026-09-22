import { agregarMapa, MapaOperativo } from "@/modules/mapa-operativo";
import { contextoActual } from "@/shared/auth";
import { Migaja, PaginaDePanel, PantallaDeMensaje } from "@/shared/ui";
import { leerParametrosDeMapa } from "./parametros";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PaginaDeMapaOperativo({ searchParams }: Props) {
  const contexto = await contextoActual();
  if (!contexto)
    return <PantallaDeMensaje mensaje="No se pudo determinar su sesion." />;
  const filtros = leerParametrosDeMapa(await searchParams);
  const mapa = await agregarMapa(contexto, filtros);
  return (
    <PaginaDePanel
      titulo="Mapa operativo"
      migaja={
        <Migaja pasos={[{ etiqueta: "Mapa operativo" }]} etiqueta="Ruta" />
      }
    >
      <MapaOperativo mapa={mapa} filtros={filtros} />
    </PaginaDePanel>
  );
}
