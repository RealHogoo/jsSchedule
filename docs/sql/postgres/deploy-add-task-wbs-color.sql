ALTER TABLE schedule_task
    ADD COLUMN IF NOT EXISTS wbs_color VARCHAR(7);
