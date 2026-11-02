# Mapa práctico del código

**Empieza aquí cuando quieras cambiar algo en Gremio-Expediciones.** Esta página es una guía de localización, no una segunda fuente de reglas. Conserva una sola definición por clase, habilidad, objeto o enemigo.

## Editar los datos del juego

| Quiero modificar… | Archivo que debo abrir |
| --- | --- |
| Añadir o ajustar una clase, tier, requisitos o maestrías | [`src/lib/catalogos/clases.ts`](../src/lib/catalogos/clases.ts) |
| Crear una habilidad o cambiar sus valores y coste | [`src/lib/catalogos/habilidades.ts`](../src/lib/catalogos/habilidades.ts) |
| Añadir armas, armaduras, consumibles o materiales | [`src/lib/catalogos/objetos.ts`](../src/lib/catalogos/objetos.ts) |
| Añadir enemigos, ajustar estadísticas o definir botín | [`src/lib/catalogos/enemigos.ts`](../src/lib/catalogos/enemigos.ts) |
| Cómo se calculan las estadísticas y el progreso JOB | `src/lib/progresion/`; ver [su README](../src/lib/progresion/README.md) |
| Equipo, inventario, sufijos y drops | `src/lib/equipamiento/` |
| Identificar objetos equipados en todas las ranuras | `src/lib/equipamiento/ranuras.ts` |
| Reglas del mercado | [`src/lib/economia/mercado.ts`](../src/lib/economia/mercado.ts) |
| Edificios de la base y sus mejoras | `src/lib/base/`; ver [su README](../src/lib/base/README.md) |

Los catálogos en `src/lib/catalogos/` son la **única fuente de datos editable**. Los módulos de acceso `src/lib/habilidades.ts`, `src/lib/objetos.ts`, `src/lib/progresion/clases.ts` y los servicios actúan como APIs o transformaciones: no dupliques allí las definiciones. Más detalles: [README de catálogos](../src/lib/catalogos/README.md).

## Cambiar cómo funciona el juego

| Quiero modificar… | Dónde está |
| --- | --- |
| Daño físico/mágico, curación y habilidades durante combate | `src/lib/expediciones/combate.ts`, `mecanicas-habilidades.ts` |
| Estados temporales, DoT, barreras y buffs | `src/lib/expediciones/estados-combate.ts` |
| Objetivos únicos, propios, aliados y áreas | `src/lib/expediciones/objetivos-combate.ts` |
| Cola de iniciativa y velocidad relativa | `src/lib/expediciones/iniciativa-combate.ts`; parties: `src/lib/party/iniciativa.ts` |
| Duración de expediciones, ida y regreso | `src/lib/expediciones/tiempos.ts` y `src/server/services/expediciones/` |
| Misiones, amenazas, enemigos de una expedición | `src/lib/expediciones/generador-misiones.ts`, `dificultad.ts`, `enemigos-combate.ts` |
| Recompensas y experiencia de party | `src/lib/party/recompensas.ts` y `src/server/services/party/liquidacion-recompensas.ts` |
| Combates de un jugador | `src/server/services/combate/pve.ts` |
| Combates de party | `src/server/services/party/combate-party-actions.ts` (jugador), `turno-enemigo.ts` (enemigos) |
| Inicio del regreso tras una lucha de party | `src/server/services/party/regreso-combate.ts` |

**Regla de mantenimiento:** `src/lib/` contiene reglas y transformaciones reutilizables; `src/server/services/` ejecuta operaciones con Prisma, transacciones y controles de concurrencia. No pongas consultas a la base de datos en los componentes.

## Cambiar pantallas o interacciones

| Quiero modificar… | Dónde está |
| --- | --- |
| Base y edificios | `src/app/base/`, `src/components/base/` |
| Hoja rápida de personaje (perfil y estadísticas) | `src/components/HojaPersonajeModal.tsx` |
| Ranuras de equipo de la hoja rápida | `src/components/personaje/EquipoFichaPersonaje.tsx` |
| Habilidades activas y pasivas de la hoja rápida | `src/components/personaje/HabilidadesFichaPersonaje.tsx` |
| Gestión completa de equipo, mochila e inventario | `src/app/base/personaje/page.tsx` |
| Silueta, ranuras, selección y botones de equipamiento | `src/components/personaje/EquipoPersonaje.tsx` |
| Categorías de mochila, miniaturas y acciones de objetos | `src/components/personaje/MochilaPersonaje.tsx` |
| Nombres/estilos de rareza y resúmenes de estadísticas (Personaje, Armería, Herrería, Botica) | `src/components/objetos/resumen-objeto.ts` |
| Tarjetas, categorías y costes de mejora en la forja | `src/components/herreria/ForjaHerreria.tsx` |
| Ofertas, miniaturas y requisitos de compra en Armería | `src/components/armeria/CatalogoArmeria.tsx` |
| Venta de equipo y recompra de última venta en Armería | `src/components/armeria/VentaArmeria.tsx` |
| Ranuras, filtros y lista de habilidades aprendidas | `src/components/personaje/HabilidadesPersonaje.tsx` |
| Progreso, atributos y desglose de estadísticas en la ficha completa | `src/components/personaje/RegistroAventurero.tsx` |
| Miniatura con información desplegable de objetos | `src/components/objetos/MiniaturaObjeto.tsx` |
| Estadísticas y detalles únicos de objetos en cualquier pantalla | `src/components/objetos/detalles-objeto.ts` |
| Profesiones y aprendizaje | `src/components/progresion/PanelProfesiones.tsx` |
| Combate en pantalla, sprites y selección de objetivos | `src/components/combate/CombateModal.tsx` |
| Panel de habilidades equipadas dentro del combate | `src/components/combate/PanelHabilidadesCombate.tsx` |
| Barra de acciones, botones y sus estilos | `src/components/combate/ComandosCombate.tsx` |
| Panel de objetos consumibles | `src/components/combate/PanelConsumiblesCombate.tsx` |
| Informe al terminar una batalla | `src/components/combate/ResultadoCombate.tsx` |
| Ventana de estadísticas de los combatientes | `src/components/combate/InformacionCombatientes.tsx` |
| Animaciones, impactos y proyectiles | `src/components/combate/animaciones/` |
| Estado, acciones HTTP y sondeo de party | `src/components/base/PanelParty.tsx` |
| Adaptación de datos de combate party a UI | `src/components/base/party/vista-combate.ts` |
| Aviso de compañía del tablón (miembros, visitas, traslados) | `src/components/base/party/AvisoCompaniaParty.tsx` |
| Contrato de expedición de party, mapa y regreso | `src/components/base/party/ExpedicionActivaParty.tsx` |
| Confirmación de disolución de party | `src/components/base/party/ConfirmacionDisolucionParty.tsx` |
| Avisos de party, traslados, crónicas e informes | `src/components/base/party/` |
| Informes de expedición y comercio | `src/components/reportes/` |
| Asedio PvP, lógica visual y estado | `src/components/combate/AsedioModal.tsx` |
| Acciones disponibles en el panel de asedio PvP | `src/components/combate/ControlesAsedio.tsx` |
| Resultado de un asedio y ventana de estadísticas PvP | `src/components/combate/ResultadoAsedio.tsx`, `InformacionAsedio.tsx` |
| Endpoints REST | `src/app/api/`, organizados por dominio |

Para combatientes y animaciones consulta [la guía específica de combate](../src/components/combate/README.md); para compañías, [la guía de party](../src/components/base/party/README.md).

## Sprites: cómo encontrar y cambiar el arte

**No edites directamente manifests, hashes o atlas derivados**: el punto de entrada es `python scripts/recursos.py`.

```bash
# Comprobar qué tiene publicado Berserker masculino:
python scripts/recursos.py heroe estado --clase berserker --sexo m

# Comprobar un enemigo o un objeto superpuesto:
python scripts/recursos.py enemigo estado --id slime_acido
python scripts/recursos.py equipo estado --id espada_hierro
```

El acceso a sprites en runtime está centralizado en `src/lib/sprites/heroes.ts` y `src/lib/sprites/enemigos.ts`. La visualización está en `src/components/combate/SpriteHeroeAnimado.tsx` y `SpriteEnemigoAnimado.tsx`. Los derivados JSON están en `src/lib/generated/`, no son catálogos.

## Cambios seguros y comprobación

1. Encuentra el **propietario único** de la regla o vista, evitando nuevas capas para funciones triviales.
2. Conserva IDs, firmas de APIs, nombres de rutas y el formato de datos persistidos. Si cambia el modelo, necesitas migración.
3. Mantén las mismas reglas de juego en commits de reorganización: sin cambios simultáneos de balance, tiempo, experiencia ni botín.
4. Haz commits pequeños y ejecuta `npm run test:base`, `npm run test:progression`, `npm run test:party`, `npm run test:combat-ui`, `npm run lint` y `npm run build` según el área modificada.
5. `npm run audit:estructura` orienta sobre imports, pero no identifica de forma concluyente código muerto: verifica rutas dinámicas y scripts antes de borrar.

Los cambios de reorganización se preparan en **`reorganizacion-1`**, sin fusionar con `main` hasta CI y revisión visual. [Historial técnico de la rama](reorganizacion-1.md).
