/** Proyecta la sombra del sprite hacia el fondo, anclada a los pies y sin reflejar el personaje. */
export function estiloSombraCombate(contexto: "party" | "hero" = "party") {
  const compresion = contexto === "party" ? 0.28 : 0.32;
  return {
    transformOrigin: "50% 100%",
    transform: `matrix(1, 0, -0.18, ${compresion}, 0, 0)`,
  };
}
