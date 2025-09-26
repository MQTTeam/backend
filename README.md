# MQTT 기반 채팅 메시지 아카이버 서버

이 서버파일은 **Express.js**, **MQTT**, **PostgreSQL**, **Redis**를 사용하여 실시간 채팅 메시지를 수집, 저장하고 관리하는 서버 애플리케이션입니다.
MQTT 브로커로부터 메시지를 구독하여 DB에 저장하고, REST API로 메시지 및 활성 사용자 목록을 제공합니다.

## 주요 기능
- **실시간 메시지 처리**
- **닉네임 중복 방지 및 활성 사용자 관리(Redis)**
- **채팅 메시지, 멘션, 리액션 DB 저장 (PostgreSQL)**
- **REST API**
- **헬스 체크 엔드포인트**
- **안전한 종료기능**

## 기술 스택

| 구분          | 사용 기술 |
|--------------|-----------|
| 서버 프레임워크 | Node.js (Express) |
| 메시징         | MQTT (mqtt.js 라이브러리) |
| 데이터베이스   | PostgreSQL (pg) |
| 캐시/세션 관리 | Redis |
| 메트릭/모니터링| Prometheus (prom-client) |

## REST API
| 메서드 | 엔드포인트 | 설명 |
|--------|------------|------|
| `POST` | `/api/join` | 닉네임 등록 (중복 방지) |
| `POST` | `/api/leave` | 활성 사용자 목록에서 제거 |
| `GET`  | `/api/messages?limit=n` | 최근 n개 메시지 조회 |
| `GET`  | `/api/active-users` | 활성 사용자 목록 조회 |
| `GET`  | `/health` | DB/Redis/MQTT 헬스 체크 |
