# Base: reglas del campamento

En esta carpeta están las **reglas de negocio**, no las pantallas de los edificios:

- `edificios.ts`: catálogo de edificios, rutas, niveles, recursos, requisitos y fórmulas de construcción.
  - `prepararMejoraEdificio`: valida nivel máximo, dependencia de otro edificio y recursos, devolviendo el coste y nivel siguiente. **No** escribe en base de datos; la ruta `src/app/api/jugador/acciones/route.ts` mantiene una transacción serializable y el débito condicionado.
- `mejoras.ts`: coste y límites declarados para velocidad y capacidad de carruaje.
- `escuela.ts`: requisitos de la Escuela de Batalla por rareza.
- `taberna.ts`: comidas y bonificaciones de expedición.

Los componentes visuales permanecen en `src/components/base/`, las pantallas en `src/app/base/` y las operaciones de persistencia en sus rutas API o `src/server/services/`.

**Ubicación definitiva:** `edificios.ts` es propietario tanto del catálogo `CONFIGURACION_EDIFICIOS` como de `IdEdificio` y `Edificio`. El store y las pantallas los importan directamente. No se mantienen reexports desde `tiposJuego.ts` ni `configuracionJuego.ts`.

Cambiar de carpeta no debe modificar costes, nivel máximo, tiempos, efectos ni rutas públicas del juego.
