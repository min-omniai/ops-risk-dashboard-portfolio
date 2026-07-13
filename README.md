# KDT Project Risk Control Center — Portfolio Edition

> **포트폴리오 공개용 저장소입니다.** 실제 운영에 쓴 대시보드를 공개용으로 정리한 버전이며, 운영 원본은 별도 비공개 저장소에 보존되어 있습니다.

KDT 게임 개발 과정 운영진이 8개 프로젝트 팀의 진척도, 일일 보고, 일정·기획·기술·컨디션·협업 리스크를 빠르게 파악하기 위한 대시보드입니다.

**라이브:** https://min-omniai.github.io/ops-risk-dashboard-portfolio/

<br>

## 1. 공개 데이터 안내

- **실제 데이터입니다.** 2026년 기업협약 KDT 게임 개발 과정(8개 팀)을 운영하며 Google Sheets로 매일 수집·동기화한 실제 운영 기록입니다. 예시용으로 만든 가짜 데이터가 아닙니다.
- **공개 범위는 최근 10일입니다.** 프로젝트 마지막 10개 기록일(2026-06-19 ~ 2026-07-02)만 들어 있고, 기준일 달력도 이 기간 안에서만 움직입니다.
- **로그인 없이 볼 수 있습니다.** 공개본은 DB에 접속하지 않고, 가린 데이터를 정적 파일(`src/data/portfolioData.json`)로 담아 배포합니다.
- **실명은 가려져 있습니다.** 학습자·강사·팀장 등 개인 이름은 성만 남기고 `ㅇㅇ`으로 표시합니다(예: 홍ㅇㅇ, 이름만 부른 경우 ㅇㅇ님).
- **기업명은 가려져 있습니다.** 협약 기업 3곳은 `A 기업`, `B 기업`, `C 기업`으로 표시합니다.
- **건강 관련 문장은 비공개입니다.** 증상·진료 등 건강 관련 문장은 `[건강 관련 내용 비공개]`로 바꿨습니다. 컨디션 위험 분류와 팀별 집계는 그대로 유지됩니다.

<br>

## 2. 화면 구성

| 영역 | 내용 |
|------|------|
| 기준일 | 달력 또는 ‹ › 버튼으로 기록일을 고르면 모든 영역이 그날 기록으로 다시 계산됩니다. 기록이 없는 날(주말·휴일)은 직전 기록일을 표시합니다 |
| 프로젝트 현황 | 위험도 1위 팀 · 주의팀 수 · 평균위험 KPI와 마일스톤 타임라인(현재 단계와 D-day) |
| 리스크 유형 | 일정·기획·기술·컨디션·협업 유형별로 해당 팀 수와 팀 목록 |
| 위험 우선순위 | 위험점수 순 팀 목록, 핵심 리스크, 확인 질문과 운영 액션 |
| 팀 상세 현황 | 기업별 탭. 상세 보기에서 진척도, 일일 보고 제출률, 리스크 유형별 근거, 확인 질문(판단 기준·후속 조치), GOOD / RISK / NOTE |
| 상세 로그 | 컨디션 주의 팀, 최근 3일 스크럼 기록 |

<br>

## 3. 위험 등급 기준

위험점수(0–100)는 리스크 신호의 합입니다.

| 항목 | 점수 |
|------|------|
| 기획 리스크 | +30 |
| 일정 리스크 · 기술 리스크 | 각 +25 |
| 컨디션 리스크 · 협업 리스크 | 각 +10 |
| 진척도 60% 미만 | +10 |
| 일일 보고 제출률 60% 이하 | +5 |
| 등록된 위험 항목 1건당 | +5 |
| 특이사항 1건당 | +3 |

| 점수 | 등급 | 표시 |
|------|------|------|
| 0–30 | Normal | 초록 |
| 31–60 | Caution | 파랑 |
| 61–80 | Warning | 노랑, 행 배경 강조 |
| 81–100 | Critical | 빨강, 행 배경 강조 |

<br>

## 4. 데이터 흐름

```
[운영 원본]  Google Sheets ──Apps Script(매일 07시)──▶ Supabase team_daily_status ──▶ 관리자 대시보드(로그인)

[공개본]     team_daily_status
               └▶ team_daily_status_masked     실명 가림 (masked_names)
                   └▶ team_daily_status_portfolio  기업명 가림 (masked_companies) + 최근 10개 기록일
                       └▶ scripts/build-portfolio-data.py  건강 관련 문장 가림
                           └▶ src/data/portfolioData.json ──▶ GitHub Pages (로그인 없음)
```

실제 이름·기업명 목록은 저장소에 두지 않고 DB 표에서만 관리합니다. 원본 데이터는 바꾸지 않고 뷰에서 가립니다.

<br>

## 5. 기술 스택

- React 18 · TypeScript · Vite
- Supabase (Postgres 뷰 · Row Level Security) — 운영 원본의 저장소·인증, 공개 데이터 가공
- Google Apps Script — Sheets → Supabase 일일 동기화
- GitHub Pages — 정적 배포

<br>

## 6. 실행 · 빌드 · 배포

```bash
npm install
npm run dev      # 로컬 실행
npm run build    # 빌드
npm run deploy   # gh-pages 브랜치로 배포
```

<br>

## 7. 공개 데이터 갱신

1. `supabase/mask-names.sql`, `supabase/portfolio-view.sql`을 Supabase SQL Editor에서 실행해 가림 표와 뷰를 만듭니다. 누락된 이름은 `masked_names`에 행을 추가합니다(`source`: `manual`, 이름만 부르는 경우 `given`).
2. `team_daily_status_portfolio` 뷰를 JSON 배열로 내보냅니다(관리자 권한 필요).
3. `python3 scripts/build-portfolio-data.py <내보낸 파일>`을 실행하면 `src/data/portfolioData.json`이 만들어집니다. 가린 뒤에도 건강 관련 표현이 남아 있으면 스크립트가 멈춥니다.
4. `npm run deploy`로 배포합니다.

<br>

## 8. 운영 원본 참고

공개본은 로그인과 DB 연결을 쓰지 않습니다. 아래 파일은 운영 원본에서 쓰던 구성으로, 구조 참고용으로 남겨 두었습니다.

- `supabase/schema.sql`, `supabase/enable-realtime-sync.sql` — 테이블, 관리자 권한(RLS), Realtime 설정
- `google-apps-script/` — Sheets 동기화 스크립트와 설정 방법
- 운영 원본의 기본 스냅샷(`src/data/projectData.ts`)은 2026-06-15 분석본이며 개인 이름을 포함하지 않습니다
