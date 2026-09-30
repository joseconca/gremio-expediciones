const WIDTH = 10;
const HEIGHT = 10;
const EXIT_X = 5;

export const townHallInteriorCollision = {
  width: WIDTH,
  height: HEIGHT,
  tileSize: 32,

  tiles: Array.from({ length: HEIGHT }, (_, y) =>
    Array.from({ length: WIDTH }, (_, x) => {
      // Pared superior
      if (y === 0) {
        return 1;
      }

      // Pared izquierda
      if (x === 0) {
        return 1;
      }

      // Pared derecha
      if (x === WIDTH - 1) {
        return 1;
      }

      // Pared inferior, excepto el hueco de la salida (exitX = 5)
      if (y === HEIGHT - 1) {
        if (x === EXIT_X) {
          return 0; // Hueco de salida transitable
        }

        return 1;
      }

      // Interior transitable
      return 0;
    })
  ),
};
