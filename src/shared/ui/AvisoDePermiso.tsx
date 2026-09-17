import { Aviso } from "./Aviso";

type Props = {
  capacidad: string;
  requisito: string;
};

export function AvisoDePermiso({ capacidad, requisito }: Props) {
  return (
    <Aviso tono="aviso">
      {`Su rol no permite ${capacidad}. Se requiere ${requisito}.`}
    </Aviso>
  );
}
