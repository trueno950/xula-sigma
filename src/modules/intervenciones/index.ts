export type {
  DatosDeRegistroDeIntervencion,
  IntervencionGuardada,
} from "./application/puertos";
export type { EntradaDeRegistroDeIntervencion } from "./application/registrarIntervencion";
export {
  cambiarEstadoDeIntervencion,
  corregirIntervencion,
  intervencionPorId,
  registrarIntervencion,
} from "./composicion";
export * from "./domain";
export { AccionesDeIntervencion } from "./ui/AccionesDeIntervencion";
