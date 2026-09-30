export const townHallInteriorCollision = {
  width: 32,
  height: 24,
  tileSize: 32,

  tiles: Array.from({ length: 24 }, (_, y) =>
    Array.from({ length: 32 }, (_, x) => {
      // Pared superior
      if (y === 0) {
        return 1;
      }

      // Pared izquierda
      if (x === 0) {
        return 1;
      }

      // Pared derecha
      if (x === 31) {
        return 1;
      }

      // Pared inferior, excepto el hueco de la salida
      if (y === 23) {
        const exitX = 15;

        if (x === exitX) {
          return 0;
        }

        return 1;
      }

      // Interior transitable
      return 0;
    })
  ),
};
