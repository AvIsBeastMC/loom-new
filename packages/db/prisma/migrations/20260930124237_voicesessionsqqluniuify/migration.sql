-- This is an empty migration.

-- 1. Drop the existing non-unique partial index
DROP INDEX IF EXISTS idx_voice_sessions_open;

-- 2. Create the unique partial index
CREATE UNIQUE INDEX idx_voice_sessions_open 
  ON voice_sessions (guild_id, user_id) 
  WHERE status = 'ACTIVE';