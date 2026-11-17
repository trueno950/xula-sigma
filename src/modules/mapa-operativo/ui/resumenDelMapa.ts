import type { Pestana } from "@/shared/ui";
import type { FiltrosDeMapa } from "../application";
import {
  contarSinUbicar,
  etiquetaDeFiltro,
  type MapaOperativoAgregado,
  type PanelDeCalles,
  type TerritorioDeMapa,
} from "../domain";
import { hrefDelMapa } from "./urlDelMapa";

export type ChipAplicado = {
  clave: "lugar" | "tipo" | "estado" | "area";
  /** Lo que el chip dice: «Tipo: Bache». */
  etiqueta: string;
  /** La misma pantalla sin este filtro, con los otros intactos. */
  hrefQuitar: string;
};

const NOMBRE_DEL_FILTRO: Readonly<Record<ChipAplicado["clave"], string>> = {
  lugar: "Territorio",
  tipo: "Tipo",
  estado: "Estado",
  area: "Área",
};

/**
 * S1: cada filtro puesto se dice en su chip, con la misma pantalla sin ese
 * filtro y con los otros conservados. El territorio se lee por su nombre y no
 * por su uuid: el chip es para una persona.
 */
export function chipsDeFiltro(
  filtros: FiltrosDeMapa,
  territorio: TerritorioDeMapa | null,
): readonly ChipAplicado[] {
  const valores: Readonly<Record<ChipAplicado["clave"], string | undefined>> = {
    lugar: filtros.lugar === undefined ? undefined : territorio?.nombre,
    tipo:
      filtros.tipo === undefined ? undefined : etiquetaDeFiltro(filtros.tipo),
    estado:
      filtros.estado === undefined
        ? undefined
        : etiquetaDeFiltro(filtros.estado),
    area:
      filtros.area === undefined ? undefined : etiquetaDeFiltro(filtros.area),
  };
  return (Object.keys(valores) as ChipAplicado["clave"][]).flatMap((clave) => {
    const valor = valores[clave];
    if (valor === undefined) return [];
    const sinEste = { ...filtros, [clave]: undefined };
    return [
      {
        clave,
        etiqueta: `${NOMBRE_DEL_FILTRO[clave]}: ${valor}`,
        hrefQuitar: hrefDelMapa(sinEste),
      },
    ];
  });
}

const plural = (n: number, singular: string, varios: string) =>
  `${n} ${n === 1 ? singular : varios}`;

/** Lo que dice la cabecera del mapa (S2), con el conteo de calles dibujadas. */
export const callesConHechos = (calles: number): string =>
  plural(calles, "calle con hechos", "calles con hechos");

export type DatoDelResumen = {
  /** El numero, que se pinta en fuerte. */
  valor: number;
  /** La palabra que lo acompaña, concordada. */
  etiqueta: string;
};

export type ResumenDelMapa = {
  hechos: DatoDelResumen;
  calles: DatoDelResumen;
  atrasados: DatoDelResumen;
  sinUbicar: DatoDelResumen;
  /** El mismo total que la pestana «Sin ubicar (N)». */
  totalSinUbicar: number;
};

const dato = (
  valor: number,
  singular: string,
  varios: string,
): DatoDelResumen => ({ valor, etiqueta: valor === 1 ? singular : varios });

/**
 * S1: los cuatro numeros del resumen, en el orden en que se leen. Se cuentan
 * una sola vez aca -calles dibujadas son los pines, atrasados los de la
 * leyenda, sin ubicar las calles sin punto mas los hechos que no se pueden
 * dibujar- y no en cada lugar que los muestra.
 */
export const resumenDelMapa = (mapa: MapaOperativoAgregado): ResumenDelMapa => {
  const totalSinUbicar = contarSinUbicar({
    territorios: mapa.sinUbicar,
    hechos: mapa.cobertura.length,
  });
  return {
    hechos: dato(mapa.conteos.total, "hecho", "hechos"),
    calles: dato(
      mapa.marcadores.length,
      "calle en el mapa",
      "calles en el mapa",
    ),
    atrasados: dato(mapa.leyenda.atrasados, "atrasado", "atrasados"),
    sinUbicar: dato(totalSinUbicar, "sin ubicar", "sin ubicar"),
    totalSinUbicar,
  };
};

/**
 * S4: las dos pestanas del panel. Son enlaces -no estado de cliente- y cada
 * una lleva su cuenta, para no tener que entrar a saber si tiene algo.
 */
export const pestanasDePanel = (datos: {
  filtros: FiltrosDeMapa;
  panel: PanelDeCalles;
  calles: number;
  sinUbicar: number;
}): readonly Pestana[] => [
  {
    clave: "en-el-mapa",
    etiqueta: "En el mapa",
    cuenta: datos.calles,
    href: hrefDelMapa(datos.filtros, "en-el-mapa"),
    activa: datos.panel === "en-el-mapa",
    etiquetaAccesible: `En el mapa, ${callesConHechos(datos.calles)}`,
  },
  {
    clave: "sin-ubicar",
    etiqueta: "Sin ubicar",
    cuenta: datos.sinUbicar,
    href: hrefDelMapa(datos.filtros, "sin-ubicar"),
    activa: datos.panel === "sin-ubicar",
    etiquetaAccesible: `Sin ubicar, ${datos.sinUbicar} pendientes`,
  },
];
