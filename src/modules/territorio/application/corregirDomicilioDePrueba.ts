import { vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { comoCalleId, comoDomicilioId, comoLugarId } from "../domain";
import type {
  CalleGuardada,
  LugarGuardado,
  RepositorioDeCalles,
  RepositorioDeLugares,
} from "./puertos";
import type {
  DomicilioGuardado,
  RepositorioDeDomicilios,
} from "./puertosDeDomicilios";

export const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

export const asentamientoId = comoLugarId(
  "11111111-1111-4111-8111-111111111111",
);
export const lugarId = comoLugarId("22222222-2222-4222-8222-222222222222");
export const ajenoId = comoLugarId("33333333-3333-4333-8333-333333333333");
export const domicilioId = comoDomicilioId(
  "44444444-4444-4444-8444-444444444444",
);
export const calleId = comoCalleId("55555555-5555-4555-8555-555555555555");
export const entreCalleAId = comoCalleId(
  "66666666-6666-4666-8666-666666666666",
);

export const lugarGuardado: LugarGuardado = {
  id: lugarId,
  tipo: "colonia",
  nombre: "Centro",
  padreId: asentamientoId,
  bajaEn: null,
};

export const asentamientoGuardado: LugarGuardado = {
  id: asentamientoId,
  tipo: "cabecera",
  nombre: "Motul",
  padreId: null,
  bajaEn: null,
};

export const calleGuardada: CalleGuardada = {
  id: calleId,
  nombre: "Calle 21",
  lugarId: asentamientoId,
  punto: null,
  bajaEn: null,
};

export const domicilioGuardado: DomicilioGuardado = {
  id: domicilioId,
  lugarId,
  calleId,
  numero: "20",
  entreCalleAId: null,
  entreCalleBId: null,
  referencia: null,
  bajaEn: null,
};

export const datosValidos = {
  id: domicilioId,
  lugarId,
  calleId,
  numero: "21",
  entreCalleAId: null,
  entreCalleBId: null,
  referencia: null,
};

export const repositoriosFalsos = () => {
  const repositorio: RepositorioDeDomicilios = {
    crear: vi.fn(),
    buscarPorId: vi.fn(),
    bloquearPorId: vi.fn(),
    actualizar: vi.fn(),
    porLugarYSubarbol: vi.fn(),
    porCalle: vi.fn(),
    registro: vi.fn(),
    listar: vi.fn(),
  };
  const repositorioDeLugares: RepositorioDeLugares = {
    crear: vi.fn(),
    buscarPorId: vi.fn(),
    actualizar: vi.fn(),
    contarHijosActivos: vi.fn(),
    contarDomiciliosColgados: vi.fn(),
    subarbol: vi.fn(),
    listarRaices: vi.fn(),
    listarLugares: vi.fn(),
  };
  const repositorioDeCalles: RepositorioDeCalles = {
    crear: vi.fn(),
    buscarPorId: vi.fn(),
    bloquearPorId: vi.fn(),
    actualizar: vi.fn(),
    contarDomiciliosQueLaUsan: vi.fn(),
    listarPorLugar: vi.fn(),
    registrarEventoDeAlta: vi.fn(),
    registrarEventoDeRenombre: vi.fn(),
    registrarEventoDeReparenteo: vi.fn(),
    registrarEventoDeUbicacion: vi.fn(),
  };

  return { repositorio, repositorioDeLugares, repositorioDeCalles };
};
