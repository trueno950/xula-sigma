import {
  FileText,
  MapPinLine,
  MapTrifold,
  Palette,
  UsersThree,
  Warning,
  Wrench,
} from "@phosphor-icons/react/ssr";
import type { ComponentType } from "react";
import { puedeCambiarMarca, type Rol } from "@/shared/auth/roles";

export const GRUPOS_DE_MODULOS = [
  "Atención",
  "Territorio",
  "Administración",
] as const;

export type GrupoDeModulos = (typeof GRUPOS_DE_MODULOS)[number];

export type ModuloDelPanel = {
  nombre: string;
  ruta: string;
  descripcion: string;
  grupo: GrupoDeModulos;
  /** Destino fijo de la barra inferior del movil; el resto va en "Más". */
  primario?: boolean;
  /** Sin esto el modulo lo ve todo rol; la ruta sigue autorizando aparte. */
  permite?: (rol: Rol) => boolean;
  Icono: ComponentType<{ size?: number; weight?: "regular" | "fill" }>;
};

/**
 * Una lista por pantalla ya derivo en un inicio con cuatro modulos cuando el
 * panel ofrecia siete.
 */
export const MODULOS_DEL_PANEL: readonly ModuloDelPanel[] = [
  {
    nombre: "Padrón",
    ruta: "/padron",
    descripcion: "Buscar, dar de alta y editar personas del municipio.",
    grupo: "Atención",
    primario: true,
    Icono: UsersThree,
  },
  {
    nombre: "Reportes",
    ruta: "/reportes",
    descripcion: "Registrar reportes ciudadanos y darles seguimiento.",
    grupo: "Atención",
    primario: true,
    Icono: Warning,
  },
  {
    nombre: "Constancias",
    ruta: "/constancias",
    descripcion: "Configurar y emitir constancias y oficios.",
    grupo: "Atención",
    primario: true,
    Icono: FileText,
  },
  {
    nombre: "Territorio",
    ruta: "/territorio",
    descripcion: "Lugares, calles y domicilios.",
    grupo: "Territorio",
    primario: true,
    Icono: MapTrifold,
  },
  {
    nombre: "Mapa operativo",
    ruta: "/mapa-operativo",
    descripcion: "Reportes e intervenciones sobre el mapa, en vivo.",
    grupo: "Territorio",
    Icono: MapPinLine,
  },
  {
    nombre: "Intervenciones",
    ruta: "/intervenciones",
    descripcion: "Obras y trabajos del municipio en calles y lugares.",
    grupo: "Territorio",
    Icono: Wrench,
  },
  {
    nombre: "Marca",
    ruta: "/marca",
    descripcion: "Escudo y colores del municipio.",
    grupo: "Administración",
    permite: puedeCambiarMarca,
    Icono: Palette,
  },
];

export const modulosVisibles = (rol: Rol): readonly ModuloDelPanel[] =>
  MODULOS_DEL_PANEL.filter((modulo) => modulo.permite?.(rol) ?? true);

/** Un grupo sin modulos visibles para el rol no aparece. */
export const modulosAgrupados = (
  rol: Rol,
): readonly {
  titulo: GrupoDeModulos;
  modulos: readonly ModuloDelPanel[];
}[] => {
  const visibles = modulosVisibles(rol);

  return GRUPOS_DE_MODULOS.map((titulo) => ({
    titulo,
    modulos: visibles.filter((modulo) => modulo.grupo === titulo),
  })).filter((grupo) => grupo.modulos.length > 0);
};

export const modulosDeBarraInferior = (rol: Rol) => {
  const visibles = modulosVisibles(rol);
  const principales = visibles.filter((modulo) => modulo.primario).slice(0, 4);

  return {
    principales,
    resto: visibles.filter((modulo) => !principales.includes(modulo)),
  };
};

export const estaActivo = (ruta: string, destino: string): boolean =>
  ruta.startsWith(destino);
