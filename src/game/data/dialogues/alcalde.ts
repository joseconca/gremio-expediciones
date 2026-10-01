import type { Dialogue } from "../../dialogue/Dialogue";
import { CONFIGURACION_EDIFICIOS, type IdEdificio } from "@/lib/tiposJuego";

const edificios = Object.entries(CONFIGURACION_EDIFICIOS).map(
  ([id, configuracion]) => ({
    id: id as IdEdificio,
    nombre: configuracion.nombre,
  })
);

const buildingListNodeId = "building-list";

const nodosConfirmacion = edificios.map(({ id, nombre }) => ({
  id: `confirm-${id}`,
  speaker: "Alcalde",
  text: `¿Confirmas iniciar la construcción de ${nombre}?`,
  choices: [
    { text: "Confirmar elección", nextNodeId: `confirmed-${id}` },
    { text: "Elegir otro edificio", nextNodeId: buildingListNodeId },
    { text: "Cancelar", nextNodeId: "goodbye" },
  ],
}));

const nodosEleccionConfirmada = edificios.map(({ id, nombre }) => ({
  id: `confirmed-${id}`,
  speaker: "Alcalde",
  text: `Has confirmado tu elección: ${nombre}. La obra todavía no se inicia; la conexión con el sistema de construcción queda pendiente.`,
  nextNodeId: "goodbye",
}));

export const alcaldeNpcDialogue: Dialogue = {
  id: "alcalde",
  nodes: [
    {
      id: "welcome",
      speaker: "Alcalde",
      text: "Bienvenido al Ayuntamiento.",
      nextNodeId: "question",
    },
    {
      id: "question",
      speaker: "Alcalde",
      text: "¿Qué necesitas hacer en el poblado?",
      choices: [
        { text: "Quiero construir un edificio", nextNodeId: buildingListNodeId },
        { text: "Solo quería saludar", nextNodeId: "goodbye" },
      ],
    },
    {
      id: buildingListNodeId,
      speaker: "Alcalde",
      text: "¿Qué edificio quieres construir?",
      choices: edificios.map(({ id, nombre }) => ({
        text: nombre,
        nextNodeId: `confirm-${id}`,
      })),
    },
    {
      id: "goodbye",
      speaker: "Alcalde",
      text: "Cuando necesites algo, vuelve a verme.",
      nextNodeId: null,
    },
    ...nodosConfirmacion,
    ...nodosEleccionConfirmada,
  ],
};