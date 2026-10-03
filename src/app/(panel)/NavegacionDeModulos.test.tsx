import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Rol } from "@/shared/auth/roles";

const pathnameMock = vi.hoisted(() => vi.fn((): string | null => null));

vi.mock("next/navigation", () => ({ usePathname: pathnameMock }));

import { NavegacionDeModulos } from "./NavegacionDeModulos";

const pintar = (rol: Rol, ruta: string) =>
  renderToStaticMarkup(<NavegacionDeModulos ruta={ruta} rol={rol} />);

describe("NavegacionDeModulos", () => {
  beforeEach(() => pathnameMock.mockReset().mockReturnValue(null));

  it("el activo sigue a usePathname y no a la ruta inicial", () => {
    pathnameMock.mockReturnValue("/reportes");

    const html = pintar("ADMIN_MUNICIPAL", "/padron");
    const activo = html.match(/<a[^>]*aria-current="page"[^>]*>/)?.[0];

    expect(activo).toContain('href="/reportes"');
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  });

  it("titula cada grupo y lista sus modulos", () => {
    const html = pintar("ADMIN_MUNICIPAL", "/padron");

    expect(html).toContain("Atención");
    expect(html).toContain("Territorio");
    expect(html).toContain("Administración");
    expect(html).toContain('href="/marca"');
  });

  it("marca solo el modulo activo con aria-current", () => {
    const html = pintar("ADMIN_MUNICIPAL", "/reportes/alta");

    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html.match(/<a[^>]*aria-current="page"[^>]*>/)?.[0]).toContain(
      'href="/reportes"',
    );
  });

  it("no pinta un modulo que el rol no puede usar ni su grupo vacio", () => {
    const html = pintar("OPERADOR", "/padron");

    expect(html).not.toContain('href="/marca"');
    expect(html).not.toContain("Administración");
    expect(html).toContain('href="/padron"');
  });

  it("no usa una franja lateral de color para el activo", () => {
    const html = pintar("ADMIN_MUNICIPAL", "/padron");

    expect(html).not.toMatch(/border-[lr]-/);
  });
});
