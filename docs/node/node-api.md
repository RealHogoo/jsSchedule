# 노드 API 문서

## 목적

노드 API는 태스크 하위 트리 구조와 태스크 타입별 통계 항목 정의를 관리하기 위한 계약이다.
모든 API는 JWT 인증 이후 호출하는 것을 전제로 한다.

## 공통 응답 형식

```json
{
  "ok": true,
  "code": "S0000",
  "message": "정상 처리되었습니다.",
  "data": {}
}
```

오류 시 `ok=false`와 에러 코드, 메시지를 반환한다.

## 1. 노드 트리 조회

`POST /node/tree.json`

### 요청

```json
{
  "task_id": 1001
}
```

### 응답

```json
{
  "ok": true,
  "code": "S0000",
  "message": "정상 처리되었습니다.",
  "data": {
    "task": {
      "task_id": 1001,
      "task_title": "관리자 인증 연동",
      "task_type_code": "GENERAL"
    },
    "nodes": [
      {
        "node_id": 1,
        "task_id": 1001,
        "parent_node_id": null,
        "node_name": "인증 연동 분석",
        "node_type": "ANALYSIS",
        "sort_order": 1,
        "depth": 0,
        "use_yn": "Y",
        "child_count": 1,
        "children": [
          {
            "node_id": 2,
            "task_id": 1001,
            "parent_node_id": 1,
            "node_name": "토큰 검증 포인트 정리",
            "node_type": "CHECKLIST",
            "sort_order": 1,
            "depth": 1,
            "use_yn": "Y",
            "child_count": 0,
            "children": []
          }
        ]
      }
    ]
  }
}
```

### 규칙

- 트리는 `sort_order` 기준으로 정렬한다.
- 비활성 노드를 함께 보여줄지 여부는 후속 옵션으로 분리한다.
- 1차에서는 단일 태스크 기준으로만 조회한다.

## 2. 노드 상세 조회

`POST /node/detail.json`

### 요청

```json
{
  "node_id": 2
}
```

### 응답

```json
{
  "ok": true,
  "code": "S0000",
  "message": "정상 처리되었습니다.",
  "data": {
    "node_id": 2,
    "task_id": 1001,
    "parent_node_id": 1,
    "node_name": "토큰 검증 포인트 정리",
    "node_type": "CHECKLIST",
    "sort_order": 1,
    "depth": 1,
    "description": "JWT 검증 포인트 확인",
    "use_yn": "Y",
    "created_by": "SYSTEM",
    "created_at": "2026-04-08T09:00:00",
    "updated_by": "SYSTEM",
    "updated_at": "2026-04-08T09:00:00",
    "metrics": [
      {
        "metric_def_id": 3,
        "metric_name": "리스크 점검",
        "include_in_stats_yn": "N",
        "value_1": "보통",
        "value_2": "인증",
        "value_3": "체크필요"
      }
    ]
  }
}
```

## 3. 노드 저장

`POST /node/save.json`

신규 등록과 수정에 공통 사용한다.

### 요청

```json
{
  "node_id": null,
  "task_id": 1001,
  "parent_node_id": 1,
  "insert_mode": "CHILD",
  "node_name": "토큰 만료 정책 정리",
  "node_type": "CHECKLIST",
  "sort_order": 2,
  "description": "액세스/리프레시 만료 기준 정리",
  "use_yn": "Y",
  "metrics": [
    {
      "metric_def_id": 1,
      "value_1": "4",
      "value_2": "MM",
      "value_3": "backend"
    },
    {
      "metric_def_id": 3,
      "value_1": "낮음",
      "value_2": "인증",
      "value_3": "정상"
    }
  ]
}
```

### 필드 설명

- `node_id`
  - 없으면 신규, 있으면 수정
- `parent_node_id`
  - 루트 노드면 `null`
- `insert_mode`
  - `ROOT`, `CHILD`, `SIBLING`
- `sort_order`
  - 비우면 서버에서 마지막 순서로 계산 가능
- `metrics`
  - 태스크 타입에 연결된 정의만 허용

### 응답

```json
{
  "ok": true,
  "code": "S0000",
  "message": "정상 처리되었습니다.",
  "data": {
    "node_id": 11,
    "task_id": 1001,
    "parent_node_id": 1,
    "node_name": "토큰 만료 정책 정리",
    "node_type": "CHECKLIST",
    "sort_order": 2,
    "depth": 1,
    "use_yn": "Y"
  }
}
```

### 검증 규칙

- `task_id`는 필수다.
- `node_name`은 필수다.
- 자기 자신을 `parent_node_id`로 지정할 수 없다.
- 같은 태스크가 아닌 노드를 부모로 지정할 수 없다.
- 태스크 타입에 없는 `metric_def_id`는 저장할 수 없다.
- 항목 정의가 10개를 넘으면 저장할 수 없다.

## 4. 노드 이동

`POST /node/move.json`

드래그 앤 드롭 또는 버튼 이동 공통 API다.

### 요청

```json
{
  "node_id": 11,
  "target_parent_node_id": 1,
  "target_prev_node_id": 9,
  "target_next_node_id": 12,
  "move_mode": "DROP_INSIDE"
}
```

### 필드 설명

- `target_parent_node_id`
  - 이동 후 부모 노드 ID
- `target_prev_node_id`
  - 같은 레벨에서 바로 앞 노드 ID
- `target_next_node_id`
  - 같은 레벨에서 바로 뒤 노드 ID
- `move_mode`
  - `DROP_INSIDE`, `DROP_BEFORE`, `DROP_AFTER`

### 응답

```json
{
  "ok": true,
  "code": "S0000",
  "message": "정상 처리되었습니다.",
  "data": {
    "node_id": 11,
    "parent_node_id": 1,
    "sort_order": 3,
    "depth": 1
  }
}
```

### 검증 규칙

- 자기 자신 또는 자기 하위로 이동할 수 없다.
- 다른 태스크 노드 아래로 이동할 수 없다.
- 서버는 같은 부모 기준 `sort_order`를 재계산한다.
- 실패 시 클라이언트는 원래 위치로 롤백한다.

## 5. 노드 삭제

`POST /node/delete.json`

### 요청

```json
{
  "node_id": 11
}
```

### 응답

```json
{
  "ok": true,
  "code": "S0000",
  "message": "정상 처리되었습니다.",
  "data": {
    "node_id": 11,
    "deleted": true
  }
}
```

### 검증 규칙

- 자식 노드가 있으면 기본 삭제를 막는다.
- 강제 삭제가 필요하면 별도 정책과 권한 검토 후 API를 분리한다.

## 6. 태스크 타입 목록 조회

`POST /task-type/list.json`

### 요청

```json
{}
```

### 응답

```json
{
  "ok": true,
  "code": "S0000",
  "message": "정상 처리되었습니다.",
  "data": [
    {
      "task_type_code": "GENERAL",
      "task_type_name": "General Task",
      "use_yn": "Y"
    }
  ]
}
```

## 7. 태스크 타입별 통계 항목 조회

`POST /task-type/metric/list.json`

### 요청

```json
{
  "task_type_code": "GENERAL"
}
```

### 응답

```json
{
  "ok": true,
  "code": "S0000",
  "message": "정상 처리되었습니다.",
  "data": [
    {
      "metric_def_id": 1,
      "task_type_code": "GENERAL",
      "metric_name": "예상 공수",
      "include_in_stats_yn": "Y",
      "value_slot_count": 3,
      "display_order": 1,
      "use_yn": "Y"
    },
    {
      "metric_def_id": 2,
      "task_type_code": "GENERAL",
      "metric_name": "실적 공수",
      "include_in_stats_yn": "Y",
      "value_slot_count": 3,
      "display_order": 2,
      "use_yn": "Y"
    }
  ]
}
```

## 8. 태스크 타입별 통계 항목 저장

`POST /task-type/metric/save.json`

### 요청

```json
{
  "task_type_code": "GENERAL",
  "metrics": [
    {
      "metric_def_id": 1,
      "metric_name": "예상 공수",
      "include_in_stats_yn": "Y",
      "value_slot_count": 3,
      "display_order": 1,
      "use_yn": "Y"
    },
    {
      "metric_def_id": null,
      "metric_name": "품질 점검",
      "include_in_stats_yn": "N",
      "value_slot_count": 3,
      "display_order": 4,
      "use_yn": "Y"
    }
  ]
}
```

### 저장 규칙

- 태스크 타입별 최대 10개까지 허용한다.
- `metric_name`은 같은 타입 안에서 중복될 수 없다.
- `display_order`는 같은 타입 안에서 중복될 수 없다.
- `value_slot_count`는 1~3만 허용한다.
- 비활성은 `DELETE` 대신 `use_yn='N'` 우선 전략을 사용한다.

### 응답

```json
{
  "ok": true,
  "code": "S0000",
  "message": "정상 처리되었습니다.",
  "data": {
    "task_type_code": "GENERAL",
    "saved_count": 4
  }
}
```

## 9. 통계 집계용 조회 방향

1차에서는 별도 공개 API로 확정하지 않는다.
우선 집계 화면 또는 배치에서 `include_in_stats_yn='Y'` 항목만 기준으로 `node_metric_value`를 읽는 방향으로 설계한다.

## 에러 코드 초안

- `N4001`: 필수값 누락
- `N4002`: 존재하지 않는 노드
- `N4003`: 잘못된 부모 노드
- `N4004`: 자기 하위로 이동 불가
- `N4005`: 자식 노드 존재로 삭제 불가
- `N4006`: 허용되지 않은 태스크 타입 항목
- `N4007`: 태스크 타입별 항목 수 초과
