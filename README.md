# schedule-service

프로젝트 일정 및 업무(Task)를 관리하는 MSA 기반 서비스

---

## 1. 개요

schedule-service는 프로젝트, 태스크, 마일스톤, 진행상황을 관리하는 서비스이며  
admin-service에서 발급한 JWT를 기반으로 인증/권한을 처리한다.

---

## 2. 아키텍처 개요

### 2.1 구성

- admin-service
    - 로그인
    - JWT 발급 / refresh
    - 사용자 / 권한 관리

- schedule-service
    - 프로젝트 관리
    - 태스크 관리
    - 캘린더 / 대시보드
    - JWT 검증

---

### 2.2 전체 흐름

[client] → admin-service 로그인 → JWT 발급 → schedule-service 요청 → JWT 검증 → DB 조회

---

### 2.3 인증 흐름

Authorization: Bearer {access_token}

---

## 3. 인증/권한 설계

- 로그인: admin-service
- 토큰 발급: admin-service
- 토큰 검증: schedule-service
- 사용자 조회: admin-service API

---

## 4. 도메인 설계

- Project
- Task
- Milestone
- ProjectMember

---

## 5. DB 설계 (PostgreSQL)

schedule_project
schedule_task
schedule_milestone
schedule_project_member

---

## 6. API 설계

- POST /project/list.json
- POST /task/list.json
- POST /calendar/month.json
- POST /dashboard/summary.json

---

## 7. 로그/모니터링

- JOB_START
- JOB_END
- JOB_FAIL

---

## 8. 배포 구조

client → admin-service → schedule-service → PostgreSQL

---

## 9. 결론

admin-service JWT 기반 인증 구조를 따른다.

---

## 10. 실행

```powershell
$env:APP_DB_VENDOR="postgres"
$env:JWT_SECRET="change-this-secret-to-a-long-random-value"
$env:ADMIN_SERVICE_BASE_URL="http://localhost:8081"
.\gradlew.bat bootRun
```
