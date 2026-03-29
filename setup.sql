-- Daily OS — Supabase table setup v5
-- Fresh install: run the full CREATE TABLE block
-- Existing install: run only the ALTER TABLE lines at the bottom

CREATE TABLE IF NOT EXISTS daily_checkins (
    id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    entry_date          DATE        DEFAULT CURRENT_DATE,
    type                TEXT        NOT NULL CHECK (type IN ('morning', 'afternoon', 'quicklog')),

    -- Both check-ins
    cycle_day           INTEGER     CHECK (cycle_day BETWEEN 1 AND 35),
    mood                INTEGER     CHECK (mood BETWEEN 1 AND 5),
    mood_note           TEXT,
    energy              INTEGER     CHECK (energy BETWEEN 1 AND 5),
    energy_note         TEXT,

    -- Morning: Garmin data
    sleep_score         INTEGER     CHECK (sleep_score BETWEEN 0 AND 100),
    body_battery        INTEGER     CHECK (body_battery BETWEEN 0 AND 100),
    hrv_status          TEXT        CHECK (hrv_status IN ('poor', 'low', 'balanced', 'good')),
    recovery_advisory   TEXT        CHECK (recovery_advisory IN ('recover', 'maintain', 'push')),
    steps_yesterday     INTEGER,

    -- Morning intentions
    work_intention      TEXT,
    body_intention      TEXT,

    -- Afternoon
    focus_quality       TEXT        CHECK (focus_quality IN ('on_target', 'scattered', 'hyperfocused', 'checked_out')),
    body_awareness      TEXT        CHECK (body_awareness IN ('checked_in', 'drifted', 'autopilot')),
    movement            TEXT        CHECK (movement IN ('yes', 'a_bit', 'no')),
    work_status         TEXT        CHECK (work_status IN ('done', 'in_progress', 'didnt_happen')),
    note                TEXT
);

ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for personal use"
    ON daily_checkins FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_checkins_date ON daily_checkins (entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_checkins_type ON daily_checkins (type);

-- ============================================================
-- MIGRATION: already have the table? Run just these lines
-- ============================================================
-- ALTER TABLE daily_checkins ADD COLUMN IF NOT EXISTS sleep_score INTEGER CHECK (sleep_score BETWEEN 0 AND 100);
-- ALTER TABLE daily_checkins ADD COLUMN IF NOT EXISTS body_battery INTEGER CHECK (body_battery BETWEEN 0 AND 100);
-- ALTER TABLE daily_checkins ADD COLUMN IF NOT EXISTS hrv_status TEXT CHECK (hrv_status IN ('poor', 'low', 'balanced', 'good'));
-- ALTER TABLE daily_checkins ADD COLUMN IF NOT EXISTS recovery_advisory TEXT CHECK (recovery_advisory IN ('recover', 'maintain', 'push'));
-- ALTER TABLE daily_checkins ADD COLUMN IF NOT EXISTS steps_yesterday INTEGER;
-- ALTER TABLE daily_checkins DROP CONSTRAINT IF EXISTS daily_checkins_type_check;
-- ALTER TABLE daily_checkins ADD CONSTRAINT daily_checkins_type_check CHECK (type IN ('morning', 'afternoon', 'quicklog'));

-- v6 additions
-- ALTER TABLE daily_checkins ADD COLUMN IF NOT EXISTS weight NUMERIC(5,2);
