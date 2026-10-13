-- Remove persistent data owned exclusively by the retired 2.5D mode.
-- Intentionally does not drop or alter tables used by the /base game.
-- Child tables are dropped before their referenced parent tables.
DROP TABLE IF EXISTS "CombateExteriorParticipante";
DROP TABLE IF EXISTS "ExpedicionParticipante";
DROP TABLE IF EXISTS "MiembroParty";
DROP TABLE IF EXISTS "InvitacionParty";
DROP TABLE IF EXISTS "CombateExterior";
DROP TABLE IF EXISTS "ExpedicionMundo";
DROP TABLE IF EXISTS "Party";
DROP TABLE IF EXISTS "Base";
DROP TABLE IF EXISTS "Jugador";

-- This was the only 2.5D-only scalar column on a table shared with /base.
ALTER TABLE "Usuario" DROP COLUMN IF EXISTS "fechaEmpezar";

-- Invitation state was only used by the deleted 2.5D party system.
DROP TYPE IF EXISTS "EstadoInvitacion";
