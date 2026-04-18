ALTER TABLE schedule_project
    ADD COLUMN IF NOT EXISTS project_type_code VARCHAR(50);

ALTER TABLE schedule_project
    ADD COLUMN IF NOT EXISTS origin_address VARCHAR(500);

UPDATE schedule_project
SET project_type_code = COALESCE(project_type_code, 'GENERAL')
WHERE project_type_code IS NULL;

ALTER TABLE schedule_project
    ALTER COLUMN project_type_code SET DEFAULT 'GENERAL';

ALTER TABLE schedule_project
    ALTER COLUMN project_type_code SET NOT NULL;

ALTER TABLE schedule_task
    ADD COLUMN IF NOT EXISTS actual_start_date DATE,
    ADD COLUMN IF NOT EXISTS actual_end_date DATE,
    ADD COLUMN IF NOT EXISTS task_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS support_amount NUMERIC(15, 2),
    ADD COLUMN IF NOT EXISTS actual_amount NUMERIC(15, 2);

INSERT INTO schedule_task_type (
    task_type_code, task_type_name, description
) VALUES
    ('DEVELOPMENT', 'Development Task', 'Task type for development projects'),
    ('BLOG', 'Blog Task', 'Task type for blog projects')
ON CONFLICT (task_type_code) DO NOTHING;

UPDATE schedule_task t
SET task_type_code = COALESCE(p.project_type_code, 'GENERAL')
FROM schedule_project p
WHERE p.project_id = t.project_id
  AND (t.task_type_code IS NULL OR t.task_type_code = 'GENERAL');
