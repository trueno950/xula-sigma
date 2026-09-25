import type { EffectCallback } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const refrescarMock = vi.hoisted(() => vi.fn());
const conectadoMock = vi.hoisted(() => vi.fn());
const efectos = vi.hoisted(() => [] as EffectCallback[]);

vi.mock("react", async (importOriginal) => {
  const real = await importOriginal<typeof import("react")>();
  return {
    ...real,
    useState: (inicial: unknown) => [inicial, conectadoMock],
    useEffect: (efecto: EffectCallback) => efectos.push(efecto),
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refrescarMock }),
}));

import { EstadoEnVivo } from "./EstadoEnVivo";

type Escuchas = Record<string, (() => void) | undefined>;
const fuentes: FuenteDeEventos[] = [];

class FuenteDeEventos {
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  cerradas = 0;
  private escuchas: Escuchas = {};

  constructor() {
    fuentes.push(this);
  }

  addEventListener(nombre: string, escucha: () => void) {
    this.escuchas[nombre] = escucha;
  }

  close() {
    this.cerradas += 1;
  }

  emitir(nombre: string) {
    this.escuchas[nombre]?.();
  }
}

function montar() {
  vi.stubGlobal("EventSource", FuenteDeEventos);
  vi.stubGlobal("window", { clearTimeout, setTimeout });
  renderToStaticMarkup(<EstadoEnVivo />);
  const limpiar = efectos[0]?.();
  const fuente = fuentes[0];
  if (!fuente || typeof limpiar !== "function") {
    throw new Error("El efecto no abrio la fuente de eventos.");
  }
  return { fuente, limpiar };
}

afterEach(() => {
  efectos.length = 0;
  fuentes.length = 0;
  refrescarMock.mockClear();
  conectadoMock.mockClear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("EstadoEnVivo", () => {
  it("arranca desconectada y ofrece el refresco manual", () => {
    const html = renderToStaticMarkup(<EstadoEnVivo />);

    expect(html).toContain("Actualización desconectada");
    expect(html).toContain("Actualizar ahora");
    expect(html).toContain("h-11");
  });

  it("no refresca al abrir: refresca con cada actualizacion y cada resync, sin sondear", () => {
    const sondeo = vi.spyOn(globalThis, "setInterval");
    const { fuente } = montar();

    fuente.onopen?.();
    expect(refrescarMock).not.toHaveBeenCalled();

    fuente.emitir("actualizacion");
    expect(refrescarMock).toHaveBeenCalledTimes(1);

    fuente.emitir("resync");
    expect(refrescarMock).toHaveBeenCalledTimes(2);
    expect(sondeo).not.toHaveBeenCalled();
  });

  it("se declara en vivo al abrir y con cada latido, y desconectada ante un error", () => {
    const { fuente } = montar();

    fuente.onopen?.();
    expect(conectadoMock).toHaveBeenLastCalledWith(true);

    conectadoMock.mockClear();
    fuente.emitir("heartbeat");
    expect(conectadoMock).toHaveBeenLastCalledWith(true);

    fuente.onerror?.();
    expect(conectadoMock).toHaveBeenLastCalledWith(false);
  });

  it("se declara desconectada a los 45 s sin latido y un latido reinicia la cuenta", () => {
    vi.useFakeTimers();
    const { fuente } = montar();
    conectadoMock.mockClear();

    vi.advanceTimersByTime(30_000);
    fuente.emitir("heartbeat");
    vi.advanceTimersByTime(44_999);
    expect(conectadoMock).not.toHaveBeenCalledWith(false);

    vi.advanceTimersByTime(1);
    expect(conectadoMock).toHaveBeenLastCalledWith(false);
  });

  it("al desmontar cierra la fuente y cancela la cuenta de desconexion", () => {
    vi.useFakeTimers();
    const { fuente, limpiar } = montar();
    conectadoMock.mockClear();

    limpiar();
    vi.advanceTimersByTime(60_000);

    expect(fuente.cerradas).toBe(1);
    expect(conectadoMock).not.toHaveBeenCalled();
  });
});
