ALTER TABLE schedule_task
    ADD COLUMN IF NOT EXISTS parent_task_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'schedule_task_parent_task_id_fkey'
    ) THEN
        ALTER TABLE schedule_task
            ADD CONSTRAINT schedule_task_parent_task_id_fkey
            FOREIGN KEY (parent_task_id)
            REFERENCES schedule_task(task_id)
            ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_schedule_task_parent_task_id
    ON schedule_task(parent_task_id);
