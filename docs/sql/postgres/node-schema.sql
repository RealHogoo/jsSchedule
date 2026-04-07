ALTER TABLE schedule_task
    ADD COLUMN IF NOT EXISTS task_type_code VARCHAR(50);

CREATE TABLE IF NOT EXISTS schedule_task_type (
    task_type_code VARCHAR(50) PRIMARY KEY,
    task_type_name VARCHAR(100) NOT NULL,
    description TEXT,
    use_yn CHAR(1) NOT NULL DEFAULT 'Y',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS task_node (
    node_id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL REFERENCES schedule_task(task_id) ON DELETE CASCADE,
    parent_node_id BIGINT REFERENCES task_node(node_id) ON DELETE RESTRICT,
    node_name VARCHAR(200) NOT NULL,
    node_type VARCHAR(50) NOT NULL DEFAULT 'DEFAULT',
    sort_order INTEGER NOT NULL DEFAULT 0,
    depth INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    use_yn CHAR(1) NOT NULL DEFAULT 'Y',
    created_by VARCHAR(100) NOT NULL,
    updated_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_task_node_use_yn CHECK (use_yn IN ('Y', 'N')),
    CONSTRAINT chk_task_node_depth CHECK (depth >= 0),
    CONSTRAINT chk_task_node_sort_order CHECK (sort_order >= 0)
);

CREATE TABLE IF NOT EXISTS task_type_metric_def (
    metric_def_id BIGSERIAL PRIMARY KEY,
    task_type_code VARCHAR(50) NOT NULL REFERENCES schedule_task_type(task_type_code),
    metric_name VARCHAR(100) NOT NULL,
    include_in_stats_yn CHAR(1) NOT NULL DEFAULT 'Y',
    value_slot_count INTEGER NOT NULL DEFAULT 3,
    display_order INTEGER NOT NULL DEFAULT 0,
    use_yn CHAR(1) NOT NULL DEFAULT 'Y',
    created_by VARCHAR(100) NOT NULL,
    updated_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_task_type_metric_stats_yn CHECK (include_in_stats_yn IN ('Y', 'N')),
    CONSTRAINT chk_task_type_metric_use_yn CHECK (use_yn IN ('Y', 'N')),
    CONSTRAINT chk_task_type_metric_slot_count CHECK (value_slot_count BETWEEN 1 AND 3),
    CONSTRAINT chk_task_type_metric_display_order CHECK (display_order >= 0),
    CONSTRAINT uq_task_type_metric_name UNIQUE (task_type_code, metric_name),
    CONSTRAINT uq_task_type_metric_order UNIQUE (task_type_code, display_order)
);

CREATE TABLE IF NOT EXISTS node_metric_value (
    node_metric_value_id BIGSERIAL PRIMARY KEY,
    node_id BIGINT NOT NULL REFERENCES task_node(node_id) ON DELETE CASCADE,
    metric_def_id BIGINT NOT NULL REFERENCES task_type_metric_def(metric_def_id) ON DELETE RESTRICT,
    value_1 VARCHAR(200),
    value_2 VARCHAR(200),
    value_3 VARCHAR(200),
    created_by VARCHAR(100) NOT NULL,
    updated_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_node_metric_value UNIQUE (node_id, metric_def_id)
);

CREATE INDEX IF NOT EXISTS idx_schedule_task_task_type_code
    ON schedule_task(task_type_code);

CREATE INDEX IF NOT EXISTS idx_task_node_task_id
    ON task_node(task_id);

CREATE INDEX IF NOT EXISTS idx_task_node_parent_node_id
    ON task_node(parent_node_id);

CREATE INDEX IF NOT EXISTS idx_task_node_task_parent_sort
    ON task_node(task_id, parent_node_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_task_type_metric_def_type_code
    ON task_type_metric_def(task_type_code);

CREATE INDEX IF NOT EXISTS idx_node_metric_value_node_id
    ON node_metric_value(node_id);

CREATE INDEX IF NOT EXISTS idx_node_metric_value_metric_def_id
    ON node_metric_value(metric_def_id);

INSERT INTO schedule_task_type (
    task_type_code, task_type_name, description
) VALUES (
    'GENERAL', 'General Task', 'Default task type for schedule-service'
)
ON CONFLICT (task_type_code) DO NOTHING;

UPDATE schedule_task
SET task_type_code = COALESCE(task_type_code, 'GENERAL')
WHERE task_type_code IS NULL;

ALTER TABLE schedule_task
    ALTER COLUMN task_type_code SET DEFAULT 'GENERAL';

ALTER TABLE schedule_task
    ALTER COLUMN task_type_code SET NOT NULL;

INSERT INTO task_type_metric_def (
    metric_def_id, task_type_code, metric_name, include_in_stats_yn,
    value_slot_count, display_order, use_yn, created_by, updated_by
) VALUES
    (1, 'GENERAL', '예상 공수', 'Y', 3, 1, 'Y', 'SYSTEM', 'SYSTEM'),
    (2, 'GENERAL', '실적 공수', 'Y', 3, 2, 'Y', 'SYSTEM', 'SYSTEM'),
    (3, 'GENERAL', '리스크 점검', 'N', 3, 3, 'Y', 'SYSTEM', 'SYSTEM')
ON CONFLICT (metric_def_id) DO NOTHING;

INSERT INTO task_node (
    node_id, task_id, parent_node_id, node_name, node_type, sort_order, depth,
    description, use_yn, created_by, updated_by
) VALUES
    (1, 1, NULL, '인증 연동 분석', 'ANALYSIS', 1, 0, '관리자 인증 연동 범위 확인', 'Y', 'SYSTEM', 'SYSTEM'),
    (2, 1, 1, '토큰 검증 포인트 정리', 'CHECKLIST', 1, 1, 'JWT 검증 포인트 확인', 'Y', 'SYSTEM', 'SYSTEM')
ON CONFLICT (node_id) DO NOTHING;

INSERT INTO node_metric_value (
    node_metric_value_id, node_id, metric_def_id, value_1, value_2, value_3, created_by, updated_by
) VALUES
    (1, 1, 1, '8', 'MM', 'backend', 'SYSTEM', 'SYSTEM'),
    (2, 2, 3, '보통', '인증', '체크필요', 'SYSTEM', 'SYSTEM')
ON CONFLICT (node_metric_value_id) DO NOTHING;
