interface AsedioEntrante {
  id: string;
  atacanteUsuarioId: string;
  gremioAtacante: string;
  nombreAventurero: string;
  claseAventurero: string;
  hpAtacante: number;
  hpMaximoAtacante: number;
  fechaLlegada: string;
  combateActivo: boolean;
  turno: "atacante" | "defensor";
}