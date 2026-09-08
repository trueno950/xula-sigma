import { motul } from "@/shared/tenancy/municipiosDePrueba";
import { withTenant } from "@/shared/tenancy/withTenant";
import { type CalleId, comoCalleId, type LugarId } from "./domain";
import { calles, domicilios } from "./infrastructure/esquema";
import { repositorioDeCallesSql } from "./infrastructure/repositorioDeCallesSql";

export type CallesParaConteo = {
  lugarId: LugarId;
  principal: CalleId;
  transversalA: CalleId;
  transversalB: CalleId;
  noUsada: CalleId;
};

export const crearCallesParaConteo = async (
  lugarId: LugarId,
): Promise<CallesParaConteo> => {
  const [principal, transversalA, transversalB, noUsada] = await withTenant(
    motul,
    (tx) =>
      tx
        .insert(calles)
        .values([
          { ayuntamientoId: motul, nombre: "Principal", lugarId },
          { ayuntamientoId: motul, nombre: "Transversal A", lugarId },
          { ayuntamientoId: motul, nombre: "Transversal B", lugarId },
          { ayuntamientoId: motul, nombre: "No usada", lugarId },
        ])
        .returning({ id: calles.id }),
  );

  if (!principal || !transversalA || !transversalB || !noUsada) {
    throw new Error("Las calles no fueron creadas.");
  }

  return {
    lugarId,
    principal: comoCalleId(principal.id),
    transversalA: comoCalleId(transversalA.id),
    transversalB: comoCalleId(transversalB.id),
    noUsada: comoCalleId(noUsada.id),
  };
};

export const crearDomiciliosParaConteo = (callesDePrueba: CallesParaConteo) =>
  withTenant(motul, (tx) =>
    tx.insert(domicilios).values([
      {
        ayuntamientoId: motul,
        lugarId: callesDePrueba.lugarId,
        calleId: callesDePrueba.principal,
        entreCalleAId: callesDePrueba.transversalA,
        entreCalleBId: callesDePrueba.transversalB,
      },
      {
        ayuntamientoId: motul,
        lugarId: callesDePrueba.lugarId,
        calleId: callesDePrueba.noUsada,
        entreCalleAId: null,
        entreCalleBId: null,
        referencia: null,
      },
    ]),
  );

export const contarUsoDeCalle = (id: CalleId) =>
  withTenant(motul, (tx) =>
    repositorioDeCallesSql.contarDomiciliosQueLaUsan(tx, id),
  );
