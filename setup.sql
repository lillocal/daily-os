-- Daily OS — Supabase table setup
-- Run this in your Supabase SQL Editor before connecting the app

CREATE TABLE IF NOT EXISTS daily_checkins (
    id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    entry_date      DATE        DEFAULT CURRENT_DATE,
    type            TEXT        NOT NULL CHECK (type IN ('morning', 'afternoon')),

    -- Both check-ins
    cycle_day       INTEGER     CHECK (cycle_day BETWEEN 1 AND 35),
    mood            INTEGER     NOT NULL CHECK (mood BETWEEN 1 AND 5),
    energy          INTEGER     NOT NULL CHECK (energy BETWEEN 1 AND 5),

    -- Morning only
    work_intention  TEXT,
    body_intention  TEXT,

    -- Afternoon only
    body_awareness  TEXT        CHECK (body_awareness IN ('checked_in', 'drifted', 'autopilot')),
    movement        TEXT        CHECK (movement IN ('yes', 'a_bit', 'no')),
    work_status     TEXT        CHECK (work_status IN ('done', 'in_progress', 'didnt_happen')),
    note            TEXT
);

-- Enable Row Level Security
ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;

-- Allow all (personal use — single user, no auth required)
CREATE POLICY "Allow all for personal use"
    ON daily_checkins
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Optional: index for faster date queries
CREATE INDEX IF NOT EXISTS idx_checkins_date ON daily_checkins (entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_checkins_type ON daily_checkins (type);
