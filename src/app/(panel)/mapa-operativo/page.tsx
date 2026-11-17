import type { Metadata } from "next";
import {
  agregarMapa,
  MapaOperativo,
  type PanelDeCalles,
} from "@/modules/mapa-operativo";
import { contextoActual } from "@/shared/auth";
import { PaginaDePanel, PantallaDeMensaje } from "@/shared/ui";
import { EstadoEnVivo } from "@/shared/ui/EstadoEnVivo";
import { leerParametrosDeMapa } from "./parametros";

export const metadata: Metadata = { title: "Mapa operativo" };

const DESCRIPCION =
  "Dónde están los reportes y las obras abiertas del municipio, qué lleva demasiado tiempo y qué no se puede dibujar todavía.";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PaginaDeMapaOperativo({ searchParams }: Props) {
  const contexto = await contextoActual();
  if (!contexto)
    return <PantallaDeMensaje mensaje="No se pudo determinar su sesión." />;
  const parametros = leerParametrosDeMapa(await searchParams);
  const mapa = await agregarMapa(contexto, {
    tipo: parametros.tipo,
    estado: parametros.estado,
    area: parametros.area,
    lugar: parametros.lugar,
  });
  const panel: PanelDeCalles = parametros.panel;
  return (
    <PaginaDePanel titulo="Mapa operativo" descripcion={DESCRIPCION}>
      <EstadoEnVivo variante="compacta" />
      <MapaOperativo mapa={mapa} filtros={parametros} panel={panel} />
    </PaginaDePanel>
  );
}
