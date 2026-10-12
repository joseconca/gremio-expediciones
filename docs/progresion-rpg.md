# Progresión RPG: primera iteración

Esta iteración prepara el catálogo y el modelo de persistencia antes de conectar todas las reglas nuevas al motor de combate.

- Los personajes nuevos siempre empiezan como **Novato**, con nivel Base 1, Job 1 y una fila de progreso de Novato desbloqueada.
- El campo legado `nivel`/`experiencia` se conserva temporalmente para el progreso Base de los sistemas existentes.
- `ProgresoClase` guarda por separado el Job, experiencia Job, puntos de habilidad y estado de desbloqueo de cada profesión.
- El catálogo `src/lib/progresion/clases.ts` declara requisitos múltiples y niveles Job. Una clase descendiente hereda habilidades de sí misma y de todas sus clases requisito y antecesoras; por eso una híbrida como Cruzado hereda de las ramas de Caballero y Sacerdote.
- Las seis estadísticas principales y `calcularEstadisticasDerivadasRpg` están centralizadas. Los coeficientes son valores iniciales de balance y aún no reemplazan las estadísticas que consume el combate legado.
- Cada clase declara sus dominios de arma y armadura. Los multiplicadores están preparados para integrarse al cálculo común de equipo.
- Las habilidades existentes que no declaran `claseId` permanecen globales durante la transición; las nuevas habilidades profesionales deberán declarar una clase propietaria.

## Catálogo inicial

Novato; Tier 1: Espadachín, Acólito, Arquero y Mago; Tier 2: Caballero/Duelista, Sacerdote/Monje, Cazador/Explorador y Elementalista/Brujo; híbrida de ejemplo: Cruzado (Caballero Job 40 + Sacerdote Job 40). Se puede añadir Tier 3 o más declarando nuevas definiciones y requisitos.

## Migración de una base existente

Después de actualizar la rama, ejecuta:

```powershell
npx prisma migrate deploy
npx prisma generate
```

La migración añade atributos, profesión activa, energía/maná actuales y la tabla `ProgresoClase`. También crea un progreso inicial de Novato para los personajes existentes sin borrar sus campos antiguos. Para una base nueva ya inicializada mediante `prisma db push`, Prisma puede sincronizar el esquema directamente; los personajes nuevos crean su progreso al ser reclutados.
