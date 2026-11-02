# UI de compañía y combate compartido

`PanelParty.tsx` es el contenedor de estado, sondeo y acciones HTTP; no se deben mover de aquí los efectos ni temporizadores sin pruebas de reconexión y concurrencia.

- `tipos.ts`: tipos de datos del API, expediciones, participantes, traslados e informes.
- `vista-combate.ts`: conversión **pura** del combate grupal al contrato que recibe `CombateModal`.

Las posiciones tácticas de los actores del modal se calculan en `src/lib/expediciones/formacion-party.ts`. El reparto, saneamiento de recompensas y RNG determinista están en `src/lib/party/recompensas.ts`. Las transacciones de combate siguen en `src/server/services/party/`.

Al extraer componentes, conservar el ritmo de polling, los estados de diálogo, la selección de objetivo, los informes individuales y las rutas existentes; cada cambio requiere pruebas del dominio y compilación.
