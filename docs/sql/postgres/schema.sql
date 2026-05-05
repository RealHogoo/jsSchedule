CREATE TABLE IF NOT EXISTS schedule_project (
    project_id BIGSERIAL PRIMARY KEY,
    project_key VARCHAR(50) NOT NULL UNIQUE,
    project_name VARCHAR(200) NOT NULL,
    project_status VARCHAR(30) NOT NULL DEFAULT 'PLANNING',
    owner_user_id VARCHAR(100) NOT NULL,
    origin_address VARCHAR(500),
    start_date DATE,
    end_date DATE,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS schedule_milestone (
    milestone_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES schedule_project(project_id),
    milestone_name VARCHAR(200) NOT NULL,
    milestone_status VARCHAR(30) NOT NULL DEFAULT 'PLANNING',
    due_date DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS schedule_task (
    task_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES schedule_project(project_id),
    milestone_id BIGINT REFERENCES schedule_milestone(milestone_id),
    task_title VARCHAR(200) NOT NULL,
    task_status VARCHAR(30) NOT NULL DEFAULT 'TODO',
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    assignee_user_id VARCHAR(100),
    start_date DATE,
    due_date DATE,
    progress_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
    wbs_color VARCHAR(7),
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS schedule_project_member (
    project_member_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES schedule_project(project_id),
    user_id VARCHAR(100) NOT NULL,
    user_nm VARCHAR(100),
    project_role VARCHAR(30) NOT NULL DEFAULT 'MEMBER',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS schedule_task_comment (
    comment_id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL REFERENCES schedule_task(task_id) ON DELETE CASCADE,
    parent_comment_id BIGINT REFERENCES schedule_task_comment(comment_id) ON DELETE CASCADE,
    comment_content VARCHAR(2000) NOT NULL,
    created_by_user_id VARCHAR(100) NOT NULL,
    created_by_user_nm VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_schedule_project_status ON schedule_project(project_status);
CREATE INDEX IF NOT EXISTS idx_schedule_task_project_id ON schedule_task(project_id);
CREATE INDEX IF NOT EXISTS idx_schedule_task_status ON schedule_task(task_status);
CREATE INDEX IF NOT EXISTS idx_schedule_task_assignee_user_id ON schedule_task(assignee_user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_milestone_project_id ON schedule_milestone(project_id);
CREATE INDEX IF NOT EXISTS idx_schedule_task_comment_task_id ON schedule_task_comment(task_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_schedule_task_comment_one_reply
    ON schedule_task_comment(parent_comment_id)
    WHERE parent_comment_id IS NOT NULL;

INSERT INTO schedule_project (
    project_id, project_key, project_name, project_status, owner_user_id,
    start_date, end_date, description
) VALUES (
    1, 'ADMIN-PLAN', 'Admin Integration Project', 'IN_PROGRESS', 'ADMIN',
    DATE '2026-04-01', DATE '2026-04-30', 'Seed data for local schedule-service validation.'
)
ON CONFLICT (project_id) DO NOTHING;

INSERT INTO schedule_milestone (
    milestone_id, project_id, milestone_name, milestone_status, due_date
) VALUES (
    1, 1, 'Schedule Login Proxy', 'IN_PROGRESS', DATE '2026-04-10'
)
ON CONFLICT (milestone_id) DO NOTHING;

INSERT INTO schedule_task (
    task_id, project_id, milestone_id, task_title, task_status, priority,
    assignee_user_id, start_date, due_date, progress_rate, wbs_color, description
) VALUES (
    1, 1, 1, 'Connect admin-service authentication', 'IN_PROGRESS', 'HIGH',
    'ADMIN', DATE '2026-04-04', DATE '2026-04-08', 60.00, '#0F766E',
    'Local seed task used for dashboard and list API checks.'
)
ON CONFLICT (task_id) DO NOTHING;

INSERT INTO schedule_project_member (
    project_member_id, project_id, user_id, project_role
) VALUES (
    1, 1, 'ADMIN', 'OWNER'
)
ON CONFLICT (project_member_id) DO NOTHING;
