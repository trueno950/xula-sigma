import { describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { comoIntervencionId } from "../domain";
import { crearIntervencionConReferencias } from "./intervencionConReferencias";
import type { IntervencionGuardada } from "./puertos";

const contexto = {
  ayuntamientoId: "11111111-1111-4111-8111-111111111111",
  usuario: { id: "usuario-1", rol: "OPERADOR" },
  origen: "web",
} as ContextoActual;

const intervencion: IntervencionGuardada = {
  id: comoIntervencionId("33333333-3333-4333-8333-333333333333"),
  tipo: "OBRA",
  estado: "PLANIFICADA",
  fechaDeOcurrencia: "2026-01-15",
  lugarId: "22222222-2222-4222-8222-222222222222",
  calleId: "44444444-4444-4444-8444-444444444444",
  reporteId: "55555555-5555-4555-8555-555555555555",
  descripcion: "Rehabilitacion del parque municipal",
  registradoPorUsuarioId: "usuario-1",
  capturadoEn: new Date("2026-03-01T12:00:00Z"),
  actualizadoEn: new Date("2026-03-02T12:00:00Z"),
};

const referencias = {
  lugar: "Centro (colonia)",
  calle: "Calle 20",
  reporte: { id: intervencion.reporteId ?? "", folio: "REP-2026-000001" },
};

describe("intervencionConReferencias", () => {
  it("devuelve la intervencion con los nombres que lee de sus referencias", async () => {
    const lector = { leer: vi.fn().mockResolvedValue(referencias) };
    const buscar = vi.fn().mockResolvedValue(intervencion);

    const resultado = await crearIntervencionConReferencias(buscar, lector)(
      intervencion.id,
      contexto,
    );

    expect(resultado).toEqual({ intervencion, referencias });
    expect(lector.leer).toHaveBeenCalledWith(contexto, {
      lugarId: intervencion.lugarId,
      calleId: intervencion.calleId,
      reporteId: intervencion.reporteId,
    });
  });

  it("una intervencion invisible por tenant es null y no lee ninguna referencia", async () => {
    const lector = { leer: vi.fn() };
    const buscar = vi.fn().mockResolvedValue(null);

    const resultado = await crearIntervencionConReferencias(buscar, lector)(
      intervencion.id,
      contexto,
    );

    expect(resultado).toBeNull();
    expect(lector.leer).not.toHaveBeenCalled();
  });
});
