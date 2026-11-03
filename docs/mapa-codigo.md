# Mapa práctico del código

**Empieza aquí cuando quieras cambiar algo en Gremio-Expediciones.** Esta página es una guía de localización, no una segunda fuente de reglas. Conserva una sola definición por clase, habilidad, objeto o enemigo.

## Editar los datos del juego

| Quiero modificar… | Archivo que debo abrir |
| --- | --- |
| Añadir o ajustar una clase, tier, requisitos o maestrías | [`src/lib/catalogos/clases.ts`](../src/lib/catalogos/clases.ts) |
| Crear una habilidad o cambiar sus valores y coste | [`src/lib/catalogos/habilidades.ts`](../src/lib/catalogos/habilidades.ts) |
| Cambiar el orden/generación de cinco técnicas por escuela | `src/lib/progresion/generar-habilidades.ts` (transformación; los valores editables siguen en `catalogos/habilidades.ts`) |
| Traducir habilidades al motor táctico v2 y explicar sus efectos | `src/lib/progresion/catalogo-redisenado.ts` |
| Añadir armas, armaduras, consumibles o materiales | [`src/lib/catalogos/objetos.ts`](../src/lib/catalogos/objetos.ts) |
| Añadir enemigos, ajustar estadísticas o definir botín | [`src/lib/catalogos/enemigos.ts`](../src/lib/catalogos/enemigos.ts) |
| Cómo se calculan las estadísticas y el progreso JOB | `src/lib/progresion/`; ver [su README](../src/lib/progresion/README.md) |
| Total de atributos, equipo y pasivas del personaje | `src/lib/progresion/estadisticas-personaje.ts` |
| Fórmulas base, desglose y compatibilidad de cuentas antiguas | `src/lib/progresion/estadisticas-base-personaje.ts` |
| Maestrías y bonificaciones del equipo | `src/lib/progresion/bonificaciones-equipo.ts` |
| Bonificaciones pasivas y conversión de maná en inteligencia | `src/lib/progresion/bonificaciones-pasivas.ts` |
| Tipos compartidos y suma de modificadores | `src/lib/progresion/modificadores-estadisticas.ts` |
| Equipo, inventario, sufijos y drops | `src/lib/equipamiento/` |
| Comprobar si una pieza está equipada (venta/forja y todas las ranuras Prisma) | `src/lib/equipamiento/ranuras.ts` (`estaInstanciaEquipadaPersistida`) |
| Contrato de última venta, bonificaciones y recompra | `src/lib/equipamiento/ultima-venta.ts` |
| Límite de huecos en compra, recompra, botín y party | `src/lib/equipamiento/inventario.ts` (`hayHuecoInventario`) |
| Tipo de respuesta de `/api/objetos` (tiendas, forja, mochila y Botica) | `src/lib/equipamiento/datos-objetos.ts` |
| Carga y recarga del inventario en Armería y Herrería | `src/hooks/useDatosObjetosEdificio.ts` |
| Precios y solicitud de compra/venta de recursos | [`src/lib/economia/mercado.ts`](../src/lib/economia/mercado.ts); [guía](../src/lib/economia/README.md) |
| Niveles, requisitos, costes y validación de construcción de edificios | [`src/lib/base/edificios.ts`](../src/lib/base/edificios.ts) |
| Edificios de la base y sus mejoras | `src/lib/base/`; ver [su README](../src/lib/base/README.md) |

Los catálogos en `src/lib/catalogos/` son la **única fuente de datos editable**. Los módulos de acceso `src/lib/habilidades.ts`, `src/lib/objetos.ts`, `src/lib/progresion/clases.ts` y los servicios actúan como APIs o transformaciones: no dupliques allí las definiciones. Más detalles: [README de catálogos](../src/lib/catalogos/README.md).

## Cambiar cómo funciona el juego

| Quiero modificar… | Dónde está |
| --- | --- |
| Daño físico/mágico, curación y habilidades durante combate | `src/lib/expediciones/combate.ts`, `mecanicas-habilidades.ts` |
| Qué armas permiten comparar ataque físico y mágico en el básico | `src/lib/expediciones/ataque-basico-arma.ts` |
| Cálculo de daño, crítico, acierto y fallo de ataques básicos | `src/lib/expediciones/ataques-basicos.ts` |
| Cómo se representan proyectiles de básicos y habilidades | `src/lib/expediciones/presentacion-combate.ts` |
| Preparación de técnicas, ajustes por área y reloj de efectos | `src/lib/expediciones/preparacion-habilidades.ts` |
| Aplicar operaciones, disipaciones, pasivas e historial tras una habilidad | `src/lib/expediciones/mecanicas-habilidades.ts` |
| Definiciones de unidad, estado, técnica y comandos tácticos | `src/lib/expediciones/tipos-tacticos.ts` |
| Convertir efectos persistidos a estados tácticos, guardarlos y ejecutar técnicas adicionales | `src/lib/expediciones/adaptador-tactico.ts` |
| Motor de estados, pulsos, recursos y ciclos | `src/lib/expediciones/motor-tactico.ts` |
| Estados temporales, DoT, barreras y buffs | `src/lib/expediciones/estados-combate.ts` |
| Efectos de pociones: restauración fija, porcentual y límites | `src/lib/expediciones/consumibles-combate.ts` |
| Regeneración de energía y maná por turno y fracciones pendientes | `src/lib/expediciones/recursos-combate.ts` |
| Objetivos únicos, propios, aliados y áreas | `src/lib/expediciones/objetivos-combate.ts` |
| Validación de la solicitud de combate, objetivos y turnos | `src/lib/expediciones/contrato-accion-combate.ts` |
| Cola de iniciativa y velocidad relativa | `src/lib/expediciones/iniciativa-combate.ts`; parties: `src/lib/party/iniciativa.ts` |
| Consultar, establecer y descontar cooldowns de habilidades | `src/lib/expediciones/cooldowns-habilidades.ts` |
| Fecha del encuentro, regreso de combate/comercio y penalizaciones climáticas | `src/lib/expediciones/tiempos.ts` |
| Iniciar, llegar y completar expediciones individuales (Prisma y fases) | `src/server/services/expediciones/`; ver [README](../src/server/services/expediciones/README.md) |
| Misiones, amenazas, enemigos de una expedición | `src/lib/expediciones/generador-misiones.ts`, `dificultad.ts`, `enemigos-combate.ts` |
| Premios de expedición al volver y capacidad del almacén | `src/lib/expediciones/recompensas-regreso.ts` y `src/server/services/expediciones/completar-expedicion.ts` |
| Recompensas de party y sus instancias individuales | `src/server/services/party/inventario-recompensas.ts` |
| Cómo se reparte la curación de party según heridas reales | `src/lib/expediciones/presupuesto-curacion.ts` |
| Recompensas y experiencia de party | `src/lib/party/recompensas.ts` y `src/server/services/party/liquidacion-recompensas.ts` |
| Combates de un jugador | `src/server/services/combate/pve.ts` |
| Combates PvP y asedios entre jugadores | `src/server/services/combate/pvp.ts` |
| Autorización, recursos y entrada compatible de combate | `src/server/services/combate/accion-combate.ts`, `dispatcher.ts` |
| Construcción del contexto táctico para PvE, PvP y party | `src/server/services/combate/contexto-tactico.ts` |
| Escritura SQL versionada de combates (protección contra turnos concurrentes) | `src/server/services/combate/actualizar-combate-versionado.ts` |
| Combates de party | `src/server/services/party/combate-party-actions.ts` (jugador), `turno-enemigo.ts` (enemigos) |
| Preparación y persistencia del combate de asedio al llegar | `src/server/services/asedios/procesar-llegada-asedio.ts` |
| Resolución automática del turno de asedio y persistencia | `src/server/services/asedios/procesar-turno-asedio.ts` |
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
| Mochila de consumibles en Botica | `src/components/botica/MochilaBotica.tsx` |
| Secciones y tarjetas de compra de Botica | `src/components/botica/CatalogoBotica.tsx` |
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

La escala y el encaje de enemigos en pantalla están en `src/lib/sprites/escala-combate.ts` (tanto móvil como PC). `tests/combat-scale.test.cjs` forma parte de `test:progression` en CI.

El acceso a sprites en runtime está centralizado en `src/lib/sprites/heroes.ts` y `src/lib/sprites/enemigos.ts`. La visualización está en `src/components/combate/SpriteHeroeAnimado.tsx` y `SpriteEnemigoAnimado.tsx`. Los derivados JSON están en `src/lib/generated/`, no son catálogos.

Consulta también la [auditoría estructural de `src/lib/`](auditoria-src-lib.md), con cambios de ubicación confirmados y candidatos que no deben borrarse sin revisar.

## Cambios seguros y comprobación

1. Encuentra el **propietario único** de la regla o vista, evitando nuevas capas para funciones triviales.
2. Conserva IDs, firmas de APIs, nombres de rutas y el formato de datos persistidos. Si cambia el modelo, necesitas migración.
3. Mantén las mismas reglas de juego en commits de reorganización: sin cambios simultáneos de balance, tiempo, experiencia ni botín.
4. Haz commits pequeños y ejecuta `npm run test:base`, `npm run test:progression`, `npm run test:party`, `npm run test:combat-ui`, `npm run lint` y `npm run build` según el área modificada.
5. `npm run audit:estructura` orienta sobre imports, pero no identifica de forma concluyente código muerto: verifica rutas dinámicas y scripts antes de borrar.

Los cambios de reorganización se preparan en **`reorganizacion-1`**, sin fusionar con `main` hasta CI y revisión visual. [Historial técnico de la rama](reorganizacion-1.md).
