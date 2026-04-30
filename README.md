# schedule-service

`schedule-service`는 프로젝트, 태스크, 노드, 대시보드, 캘린더, WBS 화면을 제공하는 일정 관리 서비스입니다.
인증과 권한 판단은 `admin-service`를 통해 처리합니다.

## 역할

- 프로젝트 목록/상세/저장
- 태스크 목록/상세/저장
- 태스크 하위 노드 트리 관리
- 대시보드 요약/상세
- 월간 캘린더와 일별 태스크 집계
- WBS 보드와 태스크 기간 시각화

## 인증과 권한

- `admin-service`에서 발급한 JWT를 사용합니다.
- 미인증 사용자가 진입 페이지에 접근하면 `admin-service` 로그인 페이지로 리다이렉트합니다.
- 로그인 리다이렉트 URL은 `ADMIN_SERVICE_PUBLIC_BASE_URL`을 사용합니다.
- `return_url`은 현재 요청의 공개 URL 기준으로 생성합니다.
- 공개 URL 생성 시 `X-Forwarded-Proto`, `X-Forwarded-Host`, `X-Forwarded-Port`를 우선 사용합니다.
- `https` 요청인데 `X-Forwarded-Port=80`으로 들어오면 `return_url` 생성 시 `443`으로 보정합니다.

현재 적용 중인 서비스 권한:

- `DASHBOARD_ACCESS`
  - `/dashboard.html`
  - `/dashboard/summary.json`
  - `/dashboard/detail.json`
- `WRITE`
  - `/project/save.json`
  - `/task/save.json`
  - `/node/save.json`
  - `/node/move.json`
  - `/task-type/metric/save.json`
- `DELETE`
  - `/node/delete.json`

인증 진입 페이지:

- `/project.html`
- `/dashboard.html`
- `/project-form.html`
- `/task-form.html`
- `/schedule.html`
- `/task.html`
- `/wbs.html`

## 주요 API

- `POST /project/list.json`
- `POST /project/detail.json`
- `POST /project/save.json`
- `POST /project/manager-options.json`
- `POST /task/list.json`
- `POST /task/detail.json`
- `POST /task/save.json`
- `POST /node/tree.json`
- `POST /node/detail.json`
- `POST /node/save.json`
- `POST /node/move.json`
- `POST /node/delete.json`
- `POST /dashboard/summary.json`
- `POST /dashboard/detail.json`
- `POST /calendar/month.json`
- `POST /version.json`
- `POST /health/live.json`
- `POST /health/ready.json`
- `POST /health/status.json`

헬스 엔드포인트는 인증 예외입니다.

## WBS

- `/wbs.html`은 프로젝트별 WBS 전용 화면입니다.
- 상단에서 프로젝트를 선택하고, 좌측에는 태스크 목록, 우측에는 기간 막대를 보여줍니다.
- WBS 막대 색상은 태스크의 `wbs_color` 값을 사용합니다.
- 일정이 없는 태스크는 목록에는 보이지만 WBS 차트 막대는 그리지 않습니다.
- 모바일에서는 막대 탭 시 하단 오버레이로 태스크 정보를 표시합니다.

## Release 표시

- 사이드바 `Release` 영역에서 현재 반영된 짧은 Git SHA를 표시합니다.
- `POST /version.json`은 `service`, `revision` 값을 반환합니다.

## DB

기본 DB는 PostgreSQL입니다.

주요 테이블:

- `schedule_project`
- `schedule_task`
- `schedule_milestone`
- `schedule_project_member`
- `task_node`
- `task_type_metric_def`
- `node_metric_value`

추가 컬럼:

- `schedule_task.parent_task_id`
- `schedule_task.wbs_color`

운영 반영용 SQL 예시:

```sql
ALTER TABLE schedule_task
    ADD COLUMN IF NOT EXISTS wbs_color VARCHAR(7);
```

## 실행

기본 포트는 `8082`입니다.

권장 환경 변수:

```powershell
$env:APP_ENV="dev"
$env:SERVICE_ID="schedule-service"
$env:SCHEDULE_SERVICE_PUBLIC_BASE_URL="https://sch.js65.myds.me"
$env:SCHEDULE_DB_URL="jdbc:postgresql://localhost:5432/schedule"
$env:SCHEDULE_DB_USERNAME="postgres"
$env:SCHEDULE_DB_PASSWORD="postgres"
$env:JWT_SECRET="change-this-to-a-long-random-secret"
$env:ADMIN_SERVICE_BASE_URL="http://localhost:8081"
$env:ADMIN_SERVICE_PUBLIC_BASE_URL="https://adm.js65.myds.me"
.\gradlew.bat bootRun
```

`JWT_SECRET`은 `admin-service`와 같은 값을 사용해야 합니다.

운영 프록시 환경에서는:

- `ADMIN_SERVICE_BASE_URL`은 내부 호출 주소
- `ADMIN_SERVICE_PUBLIC_BASE_URL`은 로그인 페이지 외부 주소
- `SCHEDULE_SERVICE_PUBLIC_BASE_URL`은 schedule 공개 주소

로 나눠서 설정하는 구성을 권장합니다.

## 문서

- 태스크: [docs/task/task.md](docs/task/task.md)
- 캘린더: [docs/calendar/calendar.md](docs/calendar/calendar.md)
- 대시보드: [docs/dashboard/dashboard.md](docs/dashboard/dashboard.md)
- 프로젝트: [docs/project/project.md](docs/project/project.md)
- 노드: [docs/node/node.md](docs/node/node.md)
