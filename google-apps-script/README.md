# Google Sheets 자동 동기화

이 Apps Script는 아래 시트를 읽어 팀 단위 데이터를 Supabase에 저장합니다.

- `기업협약_통합_관리_시트(플밍)_2026` / `공용`
- `기업협약_데일리체크인_2026` / `Day-1`, `Day-2`, `Day-3`

## 설치

1. 통합 관리 Google Sheet에서 `확장 프로그램 > Apps Script`를 엽니다.
2. `Code.gs` 내용을 붙여 넣습니다.
3. `프로젝트 설정 > 스크립트 속성`에 다음 값을 등록합니다.

| 속성 | 값 |
| --- | --- |
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key |
| `SYNC_EMAIL` | `admin_profiles`에 등록된 동기화 계정 이메일 |
| `SYNC_PASSWORD` | 동기화 계정 비밀번호 |

4. `syncProjectRiskData`를 수동 실행하고 권한을 승인합니다.
5. Supabase `team_daily_status`에 8개 행이 생성됐는지 확인합니다.
6. `createTimeTrigger`를 한 번 실행하면 매일 오전 7시대에 자동 동기화됩니다.

Apps Script의 시간 기반 트리거는 정확히 07:00 정각이 아니라
`07:00~08:00` 사이에 실행될 수 있습니다. 시간대는 `Asia/Seoul`입니다.

운영 환경에서는 개인 관리자 계정과 분리된 동기화 전용 Auth 계정을 만들고
`admin_profiles`에 등록하는 것을 권장합니다.
