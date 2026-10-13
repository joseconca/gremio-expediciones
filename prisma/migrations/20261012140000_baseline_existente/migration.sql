-- Baseline histórico del esquema existente antes de las migraciones RPG (2026-10-12).
-- Punto de partida para reconstruir la base sombra de Prisma; en bases existentes
-- esta migración ya figura como aplicada y no volverá a ejecutar estos CREATE.

CREATE TYPE "EstadoInvitacion" AS ENUM ('PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'CANCELADA');

CREATE TABLE "Usuario" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "oro" INTEGER DEFAULT 10 NOT NULL,
  "madera" INTEGER DEFAULT 0 NOT NULL,
  "piedra" INTEGER DEFAULT 0 NOT NULL,
  "metal" INTEGER DEFAULT 0 NOT NULL,
  "baseCoords" JSONB,
  "ultimaMisionElite" TIMESTAMP(3),
  "ultimaActividad" TIMESTAMP(3),
  "fechaCreacion" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "edificios" JSONB DEFAULT '{"taberna": 1, "herreria": 0, "mercado": 0, "embajada": 0}'::jsonb NOT NULL,
  "fechaEmpezar" TIMESTAMP(3),
  CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Sesion" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "expira" TIMESTAMP(3) NOT NULL,
  "creada" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "Sesion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Personaje" (
  "id" TEXT NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "clase" TEXT NOT NULL,
  "sexo" TEXT DEFAULT 'chico' NOT NULL,
  "nombre" TEXT NOT NULL,
  "hpActual" INTEGER NOT NULL,
  "regeneracionDeVida" DOUBLE PRECISION NOT NULL,
  "ultimaRegeneracion" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "estado" TEXT DEFAULT 'ocioso' NOT NULL,
  "velocidadMejoras" INTEGER DEFAULT 0 NOT NULL,
  "capacidadCarruajeMejoras" INTEGER DEFAULT 0 NOT NULL,
  "nivel" INTEGER DEFAULT 1 NOT NULL,
  "experiencia" INTEGER DEFAULT 0 NOT NULL,
  CONSTRAINT "Personaje_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Inventario" (
  "id" TEXT NOT NULL,
  "personajeId" TEXT NOT NULL,
  CONSTRAINT "Inventario_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventarioObjeto" (
  "id" TEXT NOT NULL,
  "inventarioId" TEXT NOT NULL,
  "objetoId" TEXT NOT NULL,
  "cantidad" INTEGER DEFAULT 1 NOT NULL,
  "nivelMejora" INTEGER DEFAULT 0 NOT NULL,
  CONSTRAINT "InventarioObjeto_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EquipoEquipado" (
  "id" TEXT NOT NULL,
  "personajeId" TEXT NOT NULL,
  "armaInventarioId" TEXT,
  "armaduraInventarioId" TEXT,
  "accesorioInventarioId" TEXT,
  CONSTRAINT "EquipoEquipado_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HabilidadAprendida" (
  "id" TEXT NOT NULL,
  "personajeId" TEXT NOT NULL,
  "habilidadId" TEXT NOT NULL,
  "slot" TEXT,
  CONSTRAINT "HabilidadAprendida_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExpedicionActiva" (
  "id" TEXT NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "objetivoId" TEXT,
  "fase" TEXT NOT NULL,
  "resultadoFinal" TEXT,
  "misionId" TEXT NOT NULL,
  "enemigoId" TEXT,
  "nombre" TEXT NOT NULL,
  "recompensa" JSONB NOT NULL,
  "dificultad" INTEGER NOT NULL,
  "hpPerdido" INTEGER DEFAULT 0 NOT NULL,
  "experienciaGanada" INTEGER DEFAULT 0 NOT NULL,
  "fechaSalida" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "fechaLlegada" TIMESTAMP(3) NOT NULL,
  "destinoCoords" JSONB NOT NULL,
  CONSTRAINT "ExpedicionActiva_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CombateActivo" (
  "id" TEXT NOT NULL,
  "version" INTEGER DEFAULT 0 NOT NULL,
  "expedicionId" TEXT NOT NULL,
  "fase" TEXT DEFAULT 'activo' NOT NULL,
  "ronda" INTEGER DEFAULT 1 NOT NULL,
  "turno" TEXT DEFAULT 'jugador' NOT NULL,
  "tipo" TEXT DEFAULT 'pve' NOT NULL,
  "atacanteUsuarioId" TEXT,
  "defensorUsuarioId" TEXT,
  "atacanteNombre" TEXT,
  "defensorNombre" TEXT,
  "atacanteClase" TEXT,
  "atacanteSexo" TEXT,
  "defensorClase" TEXT,
  "defensorSexo" TEXT,
  "ultimoTurnoEn" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "cooldownsDefensor" JSONB DEFAULT '{}'::jsonb NOT NULL,
  "efectosDefensor" JSONB DEFAULT '[]'::jsonb NOT NULL,
  "estadoDefensorAnterior" TEXT,
  "capacidadCarruaje" INTEGER,
  "murallaNivel" INTEGER,
  "almacenNivel" INTEGER,
  "enemigoUsuarioId" TEXT,
  "enemigoId" TEXT,
  "enemigoNombre" TEXT,
  "enemigoHp" INTEGER,
  "enemigoHpMaximo" INTEGER,
  "enemigoAtaque" INTEGER,
  "enemigoDefensa" INTEGER,
  "enemigoVelocidad" INTEGER,
  "enemigoProbCritico" DOUBLE PRECISION,
  "enemigoDanoCritico" DOUBLE PRECISION,
  "enemigoNivel" INTEGER,
  "jugadorHp" INTEGER NOT NULL,
  "jugadorHpMaximo" INTEGER NOT NULL,
  "jugadorAtaque" INTEGER NOT NULL,
  "jugadorDefensa" INTEGER NOT NULL,
  "jugadorVelocidad" INTEGER NOT NULL,
  "jugadorProbCritico" DOUBLE PRECISION NOT NULL,
  "jugadorDanoCritico" DOUBLE PRECISION NOT NULL,
  "jugadorNivel" INTEGER NOT NULL,
  "ganadorUsuarioId" TEXT,
  "botinResuelto" BOOLEAN DEFAULT false NOT NULL,
  "oroGanado" INTEGER DEFAULT 0 NOT NULL,
  "experienciaGanada" INTEGER DEFAULT 0 NOT NULL,
  "cooldowns" JSONB DEFAULT '{}'::jsonb NOT NULL,
  "efectos" JSONB DEFAULT '[]'::jsonb NOT NULL,
  "log" JSONB DEFAULT '[]'::jsonb NOT NULL,
  "ultimaAccion" JSONB,
  "creado" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "actualizado" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CombateActivo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AfinidadComercial" (
  "id" TEXT NOT NULL,
  "jugador1Id" TEXT NOT NULL,
  "jugador2Id" TEXT NOT NULL,
  "intercambios" INTEGER DEFAULT 0 NOT NULL,
  "afinidad" INTEGER DEFAULT 0 NOT NULL,
  CONSTRAINT "AfinidadComercial_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RegistroAccion" (
  "id" TEXT NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "detalle" TEXT NOT NULL,
  "fecha" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "RegistroAccion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MensajeChat" (
  "id" TEXT NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "texto" TEXT NOT NULL,
  "creado" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "MensajeChat_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Sugerencia" (
  "id" TEXT NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "titulo" TEXT NOT NULL,
  "texto" TEXT NOT NULL,
  "creado" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "Sugerencia_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Jugador" (
  "id" TEXT NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "sexo" TEXT NOT NULL,
  "clase" TEXT DEFAULT 'Novato' NOT NULL,
  "nivel" INTEGER DEFAULT 1 NOT NULL,
  "experiencia" INTEGER DEFAULT 0 NOT NULL,
  "oro" INTEGER DEFAULT 100 NOT NULL,
  "saludActual" INTEGER DEFAULT 40 NOT NULL,
  "saludMaxima" INTEGER DEFAULT 100 NOT NULL,
  "ultimoVisto" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "ubicacion" JSONB,
  "viajeRegreso" JSONB,
  "ubicacionRevision" INTEGER DEFAULT 0 NOT NULL,
  "ultimaEliteExitosa" TIMESTAMP(3),
  "rewardRevision" INTEGER DEFAULT 0 NOT NULL,
  "inventarioMundo" JSONB DEFAULT '[]'::jsonb NOT NULL,
  "equipoMundo" JSONB DEFAULT '{"items":[],"receipts":[]}'::jsonb NOT NULL,
  CONSTRAINT "Jugador_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExpedicionMundo" (
  "id" TEXT NOT NULL,
  "jugadorId" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "mission" JSONB NOT NULL,
  "phase" TEXT NOT NULL,
  "originLat" DOUBLE PRECISION NOT NULL,
  "originLng" DOUBLE PRECISION NOT NULL,
  "departureAt" TIMESTAMP(3) NOT NULL,
  "arrivalAt" TIMESTAMP(3) NOT NULL,
  "returnDepartureAt" TIMESTAMP(3),
  "returnArrivalAt" TIMESTAMP(3),
  "enemy" JSONB,
  "enemyHealth" INTEGER NOT NULL,
  "playerHealth" INTEGER NOT NULL,
  "playerMaxHealth" INTEGER NOT NULL,
  "attack" INTEGER NOT NULL,
  "defense" INTEGER NOT NULL,
  "playerSpeed" INTEGER DEFAULT 5 NOT NULL,
  "turn" TEXT DEFAULT 'player' NOT NULL,
  "enemyTurnAt" TIMESTAMP(3),
  "lastAction" JSONB,
  "version" INTEGER DEFAULT 0 NOT NULL,
  "outcome" TEXT,
  "log" TEXT DEFAULT '' NOT NULL,
  "rewardGranted" BOOLEAN DEFAULT false NOT NULL,
  "botin" JSONB DEFAULT '[]'::jsonb NOT NULL,
  "targetPlayerId" TEXT,
  CONSTRAINT "ExpedicionMundo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Base" (
  "id" TEXT NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "lat" DOUBLE PRECISION NOT NULL,
  "lng" DOUBLE PRECISION NOT NULL,
  "edificios" JSONB DEFAULT '[]'::jsonb NOT NULL,
  "embajada" BOOLEAN DEFAULT false NOT NULL,
  "creada" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "Base_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Party" (
  "id" TEXT NOT NULL,
  "liderId" TEXT NOT NULL,
  "creada" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MiembroParty" (
  "jugadorId" TEXT NOT NULL,
  "partyId" TEXT NOT NULL,
  "unido" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "MiembroParty_pkey" PRIMARY KEY ("jugadorId")
);

CREATE TABLE "InvitacionParty" (
  "id" TEXT NOT NULL,
  "emisorId" TEXT NOT NULL,
  "receptorId" TEXT NOT NULL,
  "estado" "EstadoInvitacion" DEFAULT 'PENDIENTE' NOT NULL,
  "creada" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "expira" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InvitacionParty_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExpedicionParticipante" (
  "expedicionId" TEXT NOT NULL,
  "jugadorId" TEXT NOT NULL,
  "orden" INTEGER NOT NULL,
  "nombre" TEXT NOT NULL,
  "nivel" INTEGER NOT NULL,
  "salud" INTEGER NOT NULL,
  "saludMaxima" INTEGER NOT NULL,
  "ataque" INTEGER NOT NULL,
  "defensa" INTEGER NOT NULL,
  "velocidad" INTEGER NOT NULL,
  "botin" JSONB DEFAULT '[]'::jsonb NOT NULL,
  CONSTRAINT "ExpedicionParticipante_pkey" PRIMARY KEY ("expedicionId", "jugadorId")
);

ALTER TABLE "Sesion" ADD CONSTRAINT "Sesion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Personaje" ADD CONSTRAINT "Personaje_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Inventario" ADD CONSTRAINT "Inventario_personajeId_fkey" FOREIGN KEY ("personajeId") REFERENCES "Personaje" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventarioObjeto" ADD CONSTRAINT "InventarioObjeto_inventarioId_fkey" FOREIGN KEY ("inventarioId") REFERENCES "Inventario" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EquipoEquipado" ADD CONSTRAINT "EquipoEquipado_personajeId_fkey" FOREIGN KEY ("personajeId") REFERENCES "Personaje" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EquipoEquipado" ADD CONSTRAINT "EquipoEquipado_armaInventarioId_fkey" FOREIGN KEY ("armaInventarioId") REFERENCES "InventarioObjeto" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EquipoEquipado" ADD CONSTRAINT "EquipoEquipado_armaduraInventarioId_fkey" FOREIGN KEY ("armaduraInventarioId") REFERENCES "InventarioObjeto" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EquipoEquipado" ADD CONSTRAINT "EquipoEquipado_accesorioInventarioId_fkey" FOREIGN KEY ("accesorioInventarioId") REFERENCES "InventarioObjeto" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HabilidadAprendida" ADD CONSTRAINT "HabilidadAprendida_personajeId_fkey" FOREIGN KEY ("personajeId") REFERENCES "Personaje" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExpedicionActiva" ADD CONSTRAINT "ExpedicionActiva_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CombateActivo" ADD CONSTRAINT "CombateActivo_expedicionId_fkey" FOREIGN KEY ("expedicionId") REFERENCES "ExpedicionActiva" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RegistroAccion" ADD CONSTRAINT "RegistroAccion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MensajeChat" ADD CONSTRAINT "MensajeChat_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Sugerencia" ADD CONSTRAINT "Sugerencia_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Jugador" ADD CONSTRAINT "Jugador_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExpedicionMundo" ADD CONSTRAINT "ExpedicionMundo_jugadorId_fkey" FOREIGN KEY ("jugadorId") REFERENCES "Jugador" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Base" ADD CONSTRAINT "Base_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Party" ADD CONSTRAINT "Party_liderId_fkey" FOREIGN KEY ("liderId") REFERENCES "Jugador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MiembroParty" ADD CONSTRAINT "MiembroParty_jugadorId_fkey" FOREIGN KEY ("jugadorId") REFERENCES "Jugador" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MiembroParty" ADD CONSTRAINT "MiembroParty_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvitacionParty" ADD CONSTRAINT "InvitacionParty_emisorId_fkey" FOREIGN KEY ("emisorId") REFERENCES "Jugador" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvitacionParty" ADD CONSTRAINT "InvitacionParty_receptorId_fkey" FOREIGN KEY ("receptorId") REFERENCES "Jugador" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExpedicionParticipante" ADD CONSTRAINT "ExpedicionParticipante_expedicionId_fkey" FOREIGN KEY ("expedicionId") REFERENCES "ExpedicionMundo" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExpedicionParticipante" ADD CONSTRAINT "ExpedicionParticipante_jugadorId_fkey" FOREIGN KEY ("jugadorId") REFERENCES "Jugador" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");
CREATE UNIQUE INDEX "Usuario_nombre_key" ON "Usuario"("nombre");
CREATE UNIQUE INDEX "Sesion_tokenHash_key" ON "Sesion"("tokenHash");
CREATE INDEX "Sesion_usuarioId_idx" ON "Sesion"("usuarioId");
CREATE INDEX "Sesion_expira_idx" ON "Sesion"("expira");
CREATE UNIQUE INDEX "Personaje_usuarioId_key" ON "Personaje"("usuarioId");
CREATE UNIQUE INDEX "Inventario_personajeId_key" ON "Inventario"("personajeId");
CREATE UNIQUE INDEX "InventarioObjeto_inventarioId_objetoId_key" ON "InventarioObjeto"("inventarioId", "objetoId");
CREATE UNIQUE INDEX "EquipoEquipado_personajeId_key" ON "EquipoEquipado"("personajeId");
CREATE UNIQUE INDEX "HabilidadAprendida_personajeId_habilidadId_key" ON "HabilidadAprendida"("personajeId", "habilidadId");
CREATE UNIQUE INDEX "HabilidadAprendida_personajeId_slot_key" ON "HabilidadAprendida"("personajeId", "slot");
CREATE UNIQUE INDEX "ExpedicionActiva_usuarioId_key" ON "ExpedicionActiva"("usuarioId");
CREATE UNIQUE INDEX "CombateActivo_expedicionId_key" ON "CombateActivo"("expedicionId");
CREATE INDEX "CombateActivo_defensorUsuarioId_idx" ON "CombateActivo"("defensorUsuarioId");
CREATE INDEX "CombateActivo_atacanteUsuarioId_idx" ON "CombateActivo"("atacanteUsuarioId");
CREATE INDEX "CombateActivo_tipo_fase_idx" ON "CombateActivo"("tipo", "fase");
CREATE UNIQUE INDEX "AfinidadComercial_jugador1Id_jugador2Id_key" ON "AfinidadComercial"("jugador1Id", "jugador2Id");
CREATE INDEX "MensajeChat_creado_idx" ON "MensajeChat"("creado");
CREATE INDEX "Sugerencia_creado_idx" ON "Sugerencia"("creado");
CREATE UNIQUE INDEX "Jugador_usuarioId_key" ON "Jugador"("usuarioId");
CREATE UNIQUE INDEX "ExpedicionMundo_requestId_key" ON "ExpedicionMundo"("requestId");
CREATE INDEX "ExpedicionMundo_jugadorId_phase_idx" ON "ExpedicionMundo"("jugadorId", "phase");
CREATE INDEX "ExpedicionMundo_jugadorId_departureAt_idx" ON "ExpedicionMundo"("jugadorId", "departureAt");
CREATE UNIQUE INDEX "Base_usuarioId_key" ON "Base"("usuarioId");
CREATE INDEX "Base_lat_lng_idx" ON "Base"("lat", "lng");
CREATE UNIQUE INDEX "Party_liderId_key" ON "Party"("liderId");
CREATE INDEX "MiembroParty_partyId_idx" ON "MiembroParty"("partyId");
CREATE INDEX "InvitacionParty_receptorId_estado_idx" ON "InvitacionParty"("receptorId", "estado");
CREATE INDEX "InvitacionParty_emisorId_estado_idx" ON "InvitacionParty"("emisorId", "estado");
CREATE INDEX "ExpedicionParticipante_jugadorId_idx" ON "ExpedicionParticipante"("jugadorId");
CREATE INDEX "ExpedicionParticipante_expedicionId_orden_idx" ON "ExpedicionParticipante"("expedicionId", "orden");
