import type { Milestone, Team } from "../types";

export const project = {
  name: "기업협약 프로젝트",
  today: "2026-06-15",
  dataUpdatedAt: "2026-06-15 16:06",
  checkinUpdatedThrough: "2026-06-12",
  dataSources: [
    "기업협약_통합_관리_시트(플밍)_2026 · 공용",
    "기업협약_데일리체크인_2026 · Day-1 / Day-2 / Day-3",
  ],
  milestones: [
    { name: "데모 제출", date: "2026-06-09", status: "completed" },
    { name: "CBT 1차 마감", date: "2026-06-23", status: "upcoming" },
    { name: "OBT 시작", date: "2026-06-24", status: "upcoming" },
    { name: "CBT 최종 마감", date: "2026-06-30", status: "upcoming" },
    { name: "프로젝트 배포", date: "2026-07-14", status: "upcoming" },
    { name: "발표회", date: "2026-07-16", status: "upcoming" },
  ] satisfies Milestone[],
};

const history = (day3: number, day2: number, day1: number) => [
  { date: "06.10", rate: day3 },
  { date: "06.11", rate: day2 },
  { date: "06.12", rate: day1 },
];

export const teams: Team[] = [
  {
    teamId: 1, company: "A 기업", teamName: "1팀", progress: 68, checkinRate: 50,
    healthRisk: true, scheduleRisk: false, planningRisk: false, technicalRisk: false, collaborationRisk: false,
    status: "시즌 콘텐츠 개발 준비 완료", goodPoints: ["회고 후 기능 구현 목록 구체화", "현재 작업 홀딩 및 일정 지연 없음"],
    risks: ["핵심 인력 컨디션 변수", "낮은 최신 체크인 제출률"],
    specialNotes: ["건강 변수 발생 시 업무 재분배 필요"],
    requiredQuestions: ["기능 분배 후 차주 완료 목표가 확정되었는가?", "핵심 인력 공백 시 업무 재분배 기준이 있는가?"],
    checkinHistory: history(50, 75, 50),
  },
  {
    teamId: 2, company: "A 기업", teamName: "2팀", progress: 72, checkinRate: 60,
    healthRisk: false, scheduleRisk: false, planningRisk: false, technicalRisk: false, collaborationRisk: false,
    status: "개발 안정 · 추가 기획 대기", goodPoints: ["신규 콘텐츠와 기존 기능 수정 병행", "기술 검증 외 일정 홀딩 이슈 없음"],
    risks: ["추가 기획 유입 가능성", "체크인 제출률 개선 필요"],
    specialNotes: ["사진 업로드 기능 관련 기술 검증 진행"],
    requiredQuestions: ["새 기획 포함 시 차주 완료 범위는 무엇인가?", "사진 저장 기능의 기술 검증 결과와 적용 일정은 무엇인가?"],
    checkinHistory: history(20, 40, 60),
  },
  {
    teamId: 3, company: "A 기업", teamName: "3팀", progress: 62, checkinRate: 40,
    healthRisk: true, scheduleRisk: true, planningRisk: false, technicalRisk: true, collaborationRisk: false,
    status: "마일스톤 1 지연 · 일정 재조정", goodPoints: ["출석·알림 시스템 마무리 진행", "마일스톤 2 선행 작업 병행"],
    risks: ["마일스톤 1 일정 지연", "알림 시스템 통합 지연", "팀 컨디션 저하 신호"],
    specialNotes: ["세부 지연 사유와 완료 예정일 보고 체계 보완 필요"],
    requiredQuestions: ["추가 빌드 후 마일스톤 2 착수가 가능한가?", "알림 시스템 통합 완료 예정일은 언제인가?"],
    checkinHistory: history(60, 80, 40),
  },
  {
    teamId: 4, company: "B 기업", teamName: "4팀", progress: 65, checkinRate: 75,
    healthRisk: false, scheduleRisk: true, planningRisk: false, technicalRisk: false, collaborationRisk: true,
    status: "범위 축소 후 필수 기능 집중", goodPoints: ["비필수 볼륨업 배제 합의", "인원 및 일정 재조정 완료"],
    risks: ["인원 이탈 이후 병목 가능성", "작업자 변경에 따른 인수인계 위험"],
    specialNotes: ["볼륨업 없이 필수 기능에 집중"],
    requiredQuestions: ["현재 인원 재배치로 일정 유지가 가능한가?", "담당 변경 작업의 코드 리뷰와 인수인계가 끝났는가?"],
    checkinHistory: history(75, 75, 75),
  },
  {
    teamId: 5, company: "B 기업", teamName: "5팀", progress: 58, checkinRate: 60,
    healthRisk: false, scheduleRisk: true, planningRisk: false, technicalRisk: false, collaborationRisk: false,
    status: "핵심 시스템 구현 지속", goodPoints: ["퀘스트·세이브·인사 시스템 병행", "UI와 런타임 데이터 연동 진행"],
    risks: ["MVP 필수 구현 범위가 넓음", "기능 간 통합 작업량 과다"],
    specialNotes: ["작업량 자체가 병목이므로 핵심 플레이 루프 검증 우선"],
    requiredQuestions: ["현재 플레이 가능한 핵심 루프는 무엇인가?", "CBT 전 제거 가능한 기능이 구분되어 있는가?"],
    checkinHistory: history(60, 80, 60),
  },
  {
    teamId: 6, company: "C 기업", teamName: "6팀", progress: 70, checkinRate: 80,
    healthRisk: true, scheduleRisk: true, planningRisk: true, technicalRisk: true, collaborationRisk: false,
    status: "CBT 필수 요소 지연", goodPoints: ["게임 기본 틀과 CBT 빌드 확보", "튜토리얼 추가 및 유물 시스템 구현"],
    risks: ["튜토리얼 예외 처리 부족", "내러티브 일정 산정 누락", "집중 개발에 따른 피로 신호"],
    specialNotes: ["CBT 필수 요소 우선순위 재확인 필요"],
    requiredQuestions: ["CBT 기준 튜토리얼-플레이-엔딩 흐름이 검증됐는가?", "CBT 필수 기능 완료율과 미완료 목록은 무엇인가?"],
    checkinHistory: history(60, 80, 80),
  },
  {
    teamId: 7, company: "C 기업", teamName: "7팀", progress: 75, checkinRate: 75,
    healthRisk: false, scheduleRisk: false, planningRisk: false, technicalRisk: false, collaborationRisk: false,
    status: "데이터 연결 구조 안정 진행", goodPoints: ["SO 기반 데이터 연결 구조 구현", "콘텐츠 확장 단계 진입 준비"],
    risks: ["통합 이후 실제 콘텐츠 검증 필요"],
    specialNotes: ["일시적 인원 공백과 통합 검증 일정 확인"],
    requiredQuestions: ["데이터 연결 완료 후 콘텐츠 확장 일정이 확보됐는가?", "인원 공백으로 인한 병목은 없는가?"],
    checkinHistory: history(100, 100, 75),
  },
  {
    teamId: 8, company: "C 기업", teamName: "8팀", progress: 55, checkinRate: 60,
    healthRisk: true, scheduleRisk: true, planningRisk: true, technicalRisk: true, collaborationRisk: true,
    status: "기획 미정으로 개발 시간 손실", goodPoints: ["추가 기획 유입 적극 차단", "핵심 시스템 개발은 지속"],
    risks: ["필수 기획 자료 미확정", "팀장 소통 업무 과부하", "작업량·컨디션 주의 신호"],
    specialNotes: ["팀장 작업시간의 약 30%가 기획 협의에 사용됨"],
    requiredQuestions: ["미수령 필수 기획 목록과 전달 일정이 확정됐는가?", "특수 블록·튜토리얼·스킬 DB 기획이 모두 준비됐는가?"],
    checkinHistory: history(60, 60, 60),
  },
];
