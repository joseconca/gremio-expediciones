interface AsedioModalProps {
  combate: CombateActivo;

  atacante: {
    nombre: string;
    personaje: Personaje;
  };

  defensor: {
    nombre: string;
    personaje: Personaje;
  };

  usuarioActualId: string;

  procesando?: boolean;

  onAccionCombate: (
    accion: "atacar" | "usar_habilidad",
    habilidadId?: string
  ) => Promise<AccionAnimadaCombate | null>;

  onCerrar?: () => void;
}