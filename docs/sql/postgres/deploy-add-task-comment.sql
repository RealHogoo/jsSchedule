-- Task comments with a single reply per top-level comment.
-- Safe to run multiple times on PostgreSQL.

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

CREATE INDEX IF NOT EXISTS idx_schedule_task_comment_task_id
    ON schedule_task_comment(task_id);

CREATE INDEX IF NOT EXISTS idx_schedule_task_comment_parent_id
    ON schedule_task_comment(parent_comment_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_schedule_task_comment_one_reply
    ON schedule_task_comment(parent_comment_id)
    WHERE parent_comment_id IS NOT NULL;
