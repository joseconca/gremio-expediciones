# Servicios del ciclo de expediciones

Orquestan **consultas y escrituras Prisma** de las expediciones individuales. Mantienen tres puntos de entrada públicos en `index.ts`. No mezclar con las expediciones de compañía (ver `../party/`) ni mover transacciones a `src/lib/`.

## Dónde cambiar cada etapa

- `iniciar-expedicion.ts`: valida la solicitud, selección de misión, disponibilidad de personaje y velocidad; consulta el clima; fija **la fecha prevista del encuentro a mitad del viaje** y crea la expedición dentro de una transacción.
- `llegar-expedicion.ts`: comprueba fecha/fase; devuelve el combate existente si lo hay. Delega asedios en `../asedios/procesar-llegada-asedio.ts`. En PvE **reclama condicionalmente** `en_viaje` → `combatiendo` y crea el combate en una sola transacción; otra petición sobre un estado antiguo devuelve 409 sin duplicar encuentros.
- `completar-expedicion.ts`: valida fecha/fase; el comercio **reclama condicionalmente** `en_viaje` → `regresando` antes de actualizar al personaje, todo dentro de la misma transacción. La recepción final entrega recompensas, inventario y reportes bajo una transacción `Serializable` que elimina la expedición; no duplicar la liquidación.
- `index.ts`: API pública compatible de las tres etapas.

## Fechas y reglas puras

En `src/lib/expediciones/tiempos.ts` viven tres cálculos distintos:

1. `calcularFechaEncuentroProgramada` sitúa el encuentro a **la mitad de la duración total**, una vez aplicado el clima.
2. `calcularFechasRegresoProgramadas` conserva para el combate el tramo de ida previsto. **Resolver el combate tarde no retrasa la llegada del regreso**.
3. `calcularRegresoComercioProgramado` conserva un mínimo histórico de **60 segundos por tramo**, y usa la fecha prevista del encuentro, no la hora real de confirmar el comercio.

`clasificarClimaExpedicion` traduce únicamente los códigos meteorológicos a penalización de velocidad/tiempo y texto, sin depender del proveedor. La petición a Open-Meteo, el timeout y el fallback ante errores permanecen en `iniciar-expedicion.ts`.

La normalización de recompensas enteras y el límite por recurso del almacén están en `src/lib/expediciones/recompensas-regreso.ts`; `completar-expedicion.ts` sólo orquesta su aplicación dentro de la transacción. No fusionar este lector con el de `../combate/accion-combate.ts`: el segundo conserva decimales y el de regreso aplica `Math.trunc` antes de liquidar. Cambiarlo afectaría al balance.

El control común de huecos de inventario es `hayHuecoInventario` en `src/lib/equipamiento/inventario.ts`. Se usa en el regreso individual y en `../party/inventario-recompensas.ts`; **no** unificar sin pruebas el apilamiento de objetos de party y las instancias con sufijos, ya que son contratos distintos.

**Pruebas:** `tests/expedition-times.test.cjs` cubre plazos y límites; `tests/expedition-lifecycle.test.cjs` comprueba dos solicitudes simultáneas en comercio y PvE, y el retorno de un combate existente. Ambas se ejecutan en `npm run test:progression`. También deben seguir pasando las pruebas de expediciones y reportes, party, lint y build. No alterar contratos HTTP, transacciones ni orden de escrituras durante la limpieza.
