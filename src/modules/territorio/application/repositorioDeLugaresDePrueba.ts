import { vi } from "vitest";
import type { RepositorioDeLugares } from "./puertos";

/**
 * Doble de `RepositorioDeLugares` para los tests unitarios. `bloquearPorId`
 * lee lo mismo que `buscarPorId` mientras un test no diga otra cosa: el
 * bloqueo no cambia que fila se ve, solo cuando se puede escribir.
 */
export const crearRepositorioDeLugaresFalso = (): RepositorioDeLugares => {
  const repositorio: RepositorioDeLugares = {
    crear: vi.fn(),
    buscarPorId: vi.fn(),
    bloquearPorId: vi.fn((tx, id) => repositorio.buscarPorId(tx, id)),
    actualizar: vi.fn(),
    contarHijosActivos: vi.fn(),
    contarDomiciliosColgados: vi.fn(),
    contarCallesActivas: vi.fn(),
    contarZonasActivas: vi.fn(),
    subarbol: vi.fn(),
    listarRaices: vi.fn(),
    listarLugares: vi.fn(),
    existeCabecera: vi.fn(),
  };
  return repositorio;
};
