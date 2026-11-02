# UI de compañía y combate compartido

`PanelParty.tsx` es el contenedor de estado, sondeo y acciones HTTP; no se deben mover de aquí los efectos ni temporizadores sin pruebas de reconexión y concurrencia.

- `AvisoCompaniaParty.tsx`: pergamino de compañía con integrantes, botón abandonar/disolver, traslados propios y visitas entrantes. La ejecución HTTP, los permisos y el estado siguen en `PanelParty.tsx`.
- `ExpedicionActivaParty.tsx`: contrato de expedición compartida, ruta, estado de ida/regreso, acceso al combate y crónica provisional.
- `ConfirmacionDisolucionParty.tsx`: diálogo que solicita confirmación antes de disolver; solo presenta mensajes y llama a callbacks del contenedor.
- `tipos.ts`: tipos de datos del API, expediciones, participantes, traslados e informes.
- `vista-combate.ts`: conversión **pura** del combate grupal al contrato que recibe `CombateModal`.
- `VisitasEntrantesParty.tsx`: avisos de llegadas y botones aceptar/rechazar; recibe permisos y callbacks del contenedor.
- `TrasladosPropiosParty.tsx`: avisos de viaje, mapas y regreso voluntario; recibe reloj, personaje y acciones.
- `InformeProvisionalParty.tsx`: crónica que se anexa bajo el mapa durante el regreso; no controla el estado de la expedición.
- `InformeHistoricoParty.tsx`: pergamino histórico plegable; recibe el estado expandido del contenedor.
- `RecompensasInformeParty.tsx`: **única** presentación de oro, recursos, niveles y botín para ambos informes; no contiene estado ni efectúa liquidaciones.

Los informes provisional e histórico conservan sus condiciones de visibilidad y sus controles de apertura. No unificar los estados de ambos por el mero hecho de compartir la presentación de recompensas.

Las posiciones tácticas de los actores del modal se calculan en `src/lib/expediciones/formacion-party.ts`. El reparto, saneamiento de recompensas y RNG determinista están en `src/lib/party/recompensas.ts`. Las transacciones de combate siguen en `src/server/services/party/`: `inventario-recompensas.ts` entrega objetos **dentro de la transacción recibida**, mientras `combate-party-actions.ts` coordina acciones del jugador y delega la liquidación única en `liquidacion-recompensas.ts`; `turno-enemigo.ts` ejecuta el turno de las criaturas.

Al extraer componentes, conservar el ritmo de polling, los estados de diálogo, la selección de objetivo, los informes individuales y las rutas existentes; cada cambio requiere pruebas del dominio y compilación.
