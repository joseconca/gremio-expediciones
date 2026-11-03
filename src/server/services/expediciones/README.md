# Servicios del ciclo de expediciones

Orquestan **consultas y escrituras Prisma** de las expediciones individuales. Mantienen tres puntos de entrada públicos en `index.ts`. No mezclar con las expediciones de compañía (ver `../party/`) ni mover transacciones a `src/lib/`.

## Dónde cambiar cada etapa

- `iniciar-expedicion.ts`: valida la solicitud, selección de misión, disponibilidad de personaje y velocidad; consulta el clima; fija **la fecha prevista del encuentro a mitad del viaje** y crea la expedición dentro de una transacción.
- `llegar-expedicion.ts`: comprueba fecha/fase; devuelve el combate existente si lo hay. Delega asedios en `../asedios/procesar-llegada-asedio.ts`, o selecciona y prepara enemigos y estadísticas PvE antes de crear el combate y actualizar la fase en una transacción.
- `completar-expedicion.ts`: valida la fecha y la fase; registra el regreso comercial o la recepción final del personaje y sus recompensas, inventario, reportes y estado. Debe mantener la prevención de entregas duplicadas y los límites del almacén/inventario.
- `index.ts`: API pública compatible de las tres etapas.

## Fechas y reglas puras

En `src/lib/expediciones/tiempos.ts` viven tres cálculos distintos:

1. `calcularFechaEncuentroProgramada` sitúa el encuentro a **la mitad de la duración total**, una vez aplicado el clima.
2. `calcularFechasRegresoProgramadas` conserva para el combate el tramo de ida previsto. **Resolver el combate tarde no retrasa la llegada del regreso**.
3. `calcularRegresoComercioProgramado` conserva un mínimo histórico de **60 segundos por tramo**, y usa la fecha prevista del encuentro, no la hora real de confirmar el comercio.

`clasificarClimaExpedicion` traduce únicamente los códigos meteorológicos a penalización de velocidad/tiempo y texto, sin depender del proveedor. La petición a Open-Meteo, el timeout y el fallback ante errores permanecen en `iniciar-expedicion.ts`.

No fusionar los lectores de recompensas de `../combate/accion-combate.ts` y `completar-expedicion.ts` por su nombre: el primero conserva valores numéricos decimales y el segundo aplica `Math.trunc` antes de la liquidación. Cambiarlo puede afectar al balance.

**Pruebas:** `tests/expedition-times.test.cjs` cubre los plazos y límites y forma parte de `npm run test:progression`. También deben seguir pasando las pruebas de expediciones y reportes, party, lint y build. No alterar contratos HTTP, transacciones ni orden de escrituras durante la limpieza.
