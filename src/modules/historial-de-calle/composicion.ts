import { crearLeerHistorialDeCalle } from "./application";
import { fuentesDeHistorial } from "./infrastructure";

export const leerHistorialDeCalle =
  crearLeerHistorialDeCalle(fuentesDeHistorial);
