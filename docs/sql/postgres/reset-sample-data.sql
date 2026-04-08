BEGIN;

DELETE FROM node_metric_value;
DELETE FROM task_node;
DELETE FROM schedule_task;
DELETE FROM schedule_milestone;
DELETE FROM schedule_project_member;
DELETE FROM schedule_project;

INSERT INTO schedule_project (
    project_id, project_key, project_name, project_type_code, project_status,
    owner_user_id, start_date, end_date, description
) VALUES
    (
        1, 'GEN-OPS', '일반 운영 프로젝트', 'GENERAL', 'IN_PROGRESS',
        'ADMIN', DATE '2026-04-01', DATE '2026-04-30',
        '진행률과 기본 설명만 사용하는 일반 프로젝트 샘플'
    ),
    (
        2, 'DEV-CORE', '프로젝트 관리 서비스', 'DEVELOPMENT', 'IN_PROGRESS',
        'ADMIN', DATE '2026-04-05', DATE '2026-04-30',
        '목표/실제 일정과 진행률을 함께 관리하는 개발 프로젝트 샘플'
    ),
    (
        3, 'BLOG-CAMP', '블로그 타입 프로젝트', 'BLOG', 'READY',
        'ADMIN', DATE '2026-04-10', DATE '2026-05-10',
        '주소와 금액 정보를 관리하는 블로그 프로젝트 샘플'
    );

INSERT INTO schedule_project_member (
    project_member_id, project_id, user_id, project_role
) VALUES
    (1, 1, 'ADMIN', 'OWNER'),
    (2, 2, 'ADMIN', 'OWNER'),
    (3, 3, 'ADMIN', 'OWNER');

INSERT INTO schedule_milestone (
    milestone_id, project_id, milestone_name, milestone_status, due_date
) VALUES
    (1, 1, '운영 화면 정리', 'IN_PROGRESS', DATE '2026-04-22'),
    (2, 2, '개발 태스크 구조 정리', 'IN_PROGRESS', DATE '2026-04-25'),
    (3, 3, '블로그 집행 준비', 'READY', DATE '2026-04-28');

INSERT INTO schedule_task (
    task_id, project_id, milestone_id, task_title, task_type_code, parent_task_id,
    task_status, priority, assignee_user_id, start_date, due_date,
    actual_start_date, actual_end_date, task_url, support_amount, actual_amount,
    progress_rate, description
) VALUES
    (
        1, 1, 1, '운영 점검 일정 정리', 'GENERAL', NULL,
        'IN_PROGRESS', 'MEDIUM', 'ADMIN', DATE '2026-04-08', DATE '2026-04-18',
        NULL, NULL, NULL, NULL, NULL, 45,
        '일반 프로젝트 샘플 태스크입니다.'
    ),
    (
        2, 1, 1, '운영 보고서 작성', 'GENERAL', 1,
        'TODO', 'LOW', 'ADMIN', DATE '2026-04-19', DATE '2026-04-25',
        NULL, NULL, NULL, NULL, NULL, 0,
        '상위 태스크 아래에 연결된 일반 하위 태스크 샘플입니다.'
    ),
    (
        3, 2, 2, '태스크 폼 구조 정리', 'DEVELOPMENT', NULL,
        'IN_PROGRESS', 'HIGH', 'ADMIN', DATE '2026-04-08', DATE '2026-04-10',
        DATE '2026-04-08', NULL, NULL, NULL, NULL, 0,
        '개발 프로젝트 루트 태스크 샘플입니다.'
    ),
    (
        4, 2, 2, '개발 타입 필드 분기 구현', 'DEVELOPMENT', 3,
        'TODO', 'MEDIUM', 'ADMIN', DATE '2026-04-09', DATE '2026-04-12',
        NULL, NULL, NULL, NULL, NULL, 0,
        '개발 프로젝트 자식 태스크 샘플입니다.'
    ),
    (
        5, 3, 3, '1차 블로그 집행', 'BLOG', NULL,
        'READY', 'MEDIUM', 'ADMIN', DATE '2026-04-12', DATE '2026-04-20',
        NULL, NULL, '서울특별시 강남구 테헤란로 123', 500000, 120000, 0,
        '블로그 프로젝트 주소/금액 샘플입니다.'
    ),
    (
        6, 3, 3, '2차 블로그 집행', 'BLOG', 5,
        'TODO', 'LOW', 'ADMIN', DATE '2026-04-21', DATE '2026-04-30',
        NULL, NULL, '서울특별시 마포구 월드컵북로 45', 300000, 0, 0,
        '블로그 프로젝트 하위 태스크 샘플입니다.'
    );

SELECT setval('schedule_project_project_id_seq', COALESCE((SELECT MAX(project_id) FROM schedule_project), 1), true);
SELECT setval('schedule_project_member_project_member_id_seq', COALESCE((SELECT MAX(project_member_id) FROM schedule_project_member), 1), true);
SELECT setval('schedule_milestone_milestone_id_seq', COALESCE((SELECT MAX(milestone_id) FROM schedule_milestone), 1), true);
SELECT setval('schedule_task_task_id_seq', COALESCE((SELECT MAX(task_id) FROM schedule_task), 1), true);

COMMIT;
