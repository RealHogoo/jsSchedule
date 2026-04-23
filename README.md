# schedule-service

프로젝트, 작업, 노드, 대시보드를 관리하는 Spring Boot 기반 일정 관리 서비스입니다.

## 역할

- 프로젝트 조회 및 저장
- 작업 조회 및 저장
- 노드 트리, 이동, 삭제
- 대시보드 요약 및 상세
- 캘린더/지도 보조 기능

## 인증과 권한

- 인증 원천은 `admin-service`입니다.
- 클라이언트는 `admin-service`에서 발급받은 JWT로 `schedule-service`를 호출합니다.
- `schedule-service`는 토큰 자체만 보지 않고 `admin-service /auth/me.json` 응답을 기반으로 현재 사용자와 서비스 권한을 확인합니다.

현재 적용된 서비스 권한:

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

인증이 없으면 `admin-service` 로그인 페이지로 리다이렉트됩니다.

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
- `POST /health/live.json`
- `POST /health/ready.json`
- `POST /health/status.json`

헬스 엔드포인트는 인증 예외입니다.

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

## 실행

기본 포트는 `8082`입니다.

필수 또는 권장 환경 변수:

```powershell
$env:APP_ENV="dev"
$env:SCHEDULE_DB_URL="jdbc:postgresql://localhost:5432/schedule"
$env:SCHEDULE_DB_USERNAME="postgres"
$env:SCHEDULE_DB_PASSWORD="postgres"
$env:JWT_SECRET="change-this-to-a-long-random-secret"
$env:ADMIN_SERVICE_BASE_URL="http://localhost:8081"
$env:ADMIN_SERVICE_PUBLIC_BASE_URL="https://adm.example.com"
.\gradlew.bat bootRun
```

`JWT_SECRET`는 `admin-service`와 같은 값을 사용해야 합니다.

외부 공개 환경에서는 `ADMIN_SERVICE_BASE_URL`은 내부 호출 주소를, `ADMIN_SERVICE_PUBLIC_BASE_URL`은 로그인 리다이렉트에 사용할 외부 주소를 넣는 구성을 권장합니다.

## 연동 전제

- `admin-service`가 먼저 실행 중이어야 합니다.
- `admin-service /auth/me.json`이 정상 응답해야 사용자 조회와 권한 판정이 가능합니다.

## 참고

- 서비스 권한 데이터는 `admin-service` DB의 `adm_service_perm_def`, `adm_auth_service_perm`, `adm_auth_user_service_perm`에서 관리합니다.
- 현재 `schedule-service`는 서비스 권한 모델이 실제 적용된 첫 번째 하위 서비스입니다.
