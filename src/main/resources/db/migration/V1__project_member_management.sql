-- Project member management support.

CREATE TABLE IF NOT EXISTS schedule_project_member (
    project_member_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES schedule_project(project_id),
    user_id VARCHAR(100) NOT NULL,
    user_nm VARCHAR(100),
    project_role VARCHAR(30) NOT NULL DEFAULT 'MEMBER',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (project_id, user_id)
);

ALTER TABLE schedule_project_member
    ADD COLUMN IF NOT EXISTS user_nm VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_schedule_project_member_project_id
    ON schedule_project_member(project_id);

CREATE INDEX IF NOT EXISTS idx_schedule_project_member_user_id
    ON schedule_project_member(user_id);

INSERT INTO schedule_project_member (
    project_id,
    user_id,
    project_role
)
SELECT
    p.project_id,
    p.owner_user_id,
    'OWNER'
FROM schedule_project p
WHERE p.owner_user_id IS NOT NULL
ON CONFLICT (project_id, user_id) DO UPDATE
SET project_role = 'OWNER';
