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

export type ModuloDelPanel = {
  nombre: string;
  ruta: string;
  descripcion: string;
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
    Icono: UsersThree,
  },
  {
    nombre: "Territorio",
    ruta: "/territorio",
    descripcion: "Lugares, calles y domicilios.",
    Icono: MapTrifold,
  },
  {
    nombre: "Mapa operativo",
    ruta: "/mapa-operativo",
    descripcion: "Reportes e intervenciones sobre el mapa, en vivo.",
    Icono: MapPinLine,
  },
  {
    nombre: "Reportes",
    ruta: "/reportes",
    descripcion: "Registrar reportes ciudadanos y darles seguimiento.",
    Icono: Warning,
  },
  {
    nombre: "Intervenciones",
    ruta: "/intervenciones",
    descripcion: "Obras y trabajos del municipio en calles y lugares.",
    Icono: Wrench,
  },
  {
    nombre: "Constancias",
    ruta: "/constancias",
    descripcion: "Configurar y emitir constancias y oficios.",
    Icono: FileText,
  },
  {
    nombre: "Marca",
    ruta: "/marca",
    descripcion: "Escudo y colores del municipio.",
    Icono: Palette,
  },
];
