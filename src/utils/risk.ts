import type { RiskKey, RiskLevel, Team } from "../types";

export const riskSignalKeywords: Record<RiskKey, string[]> = {
  planningRisk: [
    "기획 미정",
    "기획 미확정",
    "미정 기획",
    "기획 의존",
    "기획 의존도",
    "기획 문서 없이",
    "기획서 부족",
    "기획안 없이",
    "기획안",
    "기획 확정",
    "확정 여부",
    "미수령 필수 기획",
    "필수 기획",
    "기획 자료",
    "기획 회의",
    "기획 협의",
    "특수 블록",
    "튜토리얼 기획",
    "스킬 DB",
    "추가 기획",
    "기획 유입",
    "기능 범위",
    "필수 범위",
    "범위 확정",
    "범위 공유",
    "테스트 범위",
  ],
  scheduleRisk: ["일정 지연", "마일스톤 지연", "마감 지연", "통합 지연", "일정 재조정", "일정 변경", "시간 부족", "일정 병목", "밀린 작업", "작업량 과다", "복구 일정", "마감 복구"],
  technicalRisk: ["기술 리스크", "치명 오류", "런타임 오류", "예외 처리", "작동 안", "통합 지연", "기술 검증 실패", "R&D", "핵심 루프", "플레이 가능한 빌드"],
  healthRisk: ["건강", "컨디션", "복통", "허리", "수면", "피로", "멘탈", "의욕", "조퇴", "병원", "과부하"],
  collaborationRisk: [
    "이탈",
    "탈퇴",
    "인원 재배치",
    "인수인계",
    "소통 문제",
    "협업 문제",
    "업무 공백",
    "업무 재분배",
    "업무 조정",
    "역할 조정",
    "팀장 회의",
  ],
};

const confirmedRiskSignals: Record<number, RiskKey[]> = {
  1: ["healthRisk", "collaborationRisk"],
  2: ["scheduleRisk"],
  3: ["scheduleRisk", "technicalRisk", "healthRisk"],
  4: ["scheduleRisk", "healthRisk"],
  5: ["planningRisk", "scheduleRisk"],
  6: ["healthRisk"],
  7: ["scheduleRisk"],
  8: ["scheduleRisk", "collaborationRisk"],
};

function getRiskSignalText(team: Team, includeSource = true): string {
  return [
    team.status,
    ...team.goodPoints,
    ...team.risks,
    ...team.specialNotes,
    includeSource ? team.riskSourceText : "",
  ].join("\n");
}

function isNegatedRiskContext(text: string, keyword: string, index: number): boolean {
  const after = text.slice(index + keyword.length, index + keyword.length + 8);
  const around = text.slice(Math.max(0, index - 8), index + keyword.length + 8);

  return (
    after.includes("없") ||
    around.includes("문제 없음") ||
    around.includes("이슈 없음") ||
    around.includes("리스크 없음")
  );
}

function hasAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => {
    let index = text.indexOf(keyword);
    while (index !== -1) {
      if (!isNegatedRiskContext(text, keyword, index)) return true;
      index = text.indexOf(keyword, index + keyword.length);
    }
    return false;
  });
}

export function hasRiskSignal(team: Team, key: RiskKey): boolean {
  const confirmedSignals = confirmedRiskSignals[team.teamId];
  if (confirmedSignals) return confirmedSignals.includes(key);

  if (key === "scheduleRisk" || key === "technicalRisk") {
    return hasAny(getRiskSignalText(team, false), riskSignalKeywords[key]);
  }

  return Boolean(team[key]) || hasAny(getRiskSignalText(team), riskSignalKeywords[key]);
}

export function calculateRiskScore(team: Team): number {
  const score =
    (hasRiskSignal(team, "planningRisk") ? 30 : 0) +
    (hasRiskSignal(team, "scheduleRisk") ? 25 : 0) +
    (hasRiskSignal(team, "technicalRisk") ? 25 : 0) +
    (hasRiskSignal(team, "healthRisk") ? 10 : 0) +
    (hasRiskSignal(team, "collaborationRisk") ? 10 : 0) +
    (team.checkinRate <= 60 ? 5 : 0) +
    (team.progress < 60 ? 10 : 0) +
    team.risks.length * 5 +
    team.specialNotes.length * 3;
  return Math.min(score, 100);
}

export function getRiskLevel(score: number): RiskLevel {
  if (score <= 30) return "Normal";
  if (score <= 60) return "Caution";
  if (score <= 80) return "Warning";
  return "Critical";
}

export function getRiskColor(level: RiskLevel): string {
  return { Normal: "#3fb950", Caution: "#58a6ff", Warning: "#d29922", Critical: "#f85149" }[level];
}

export function getDaysUntil(date: string, today: string): number {
  return Math.ceil((new Date(`${date}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86_400_000);
}

export function sortTeamsByRisk(teams: Team[]): Team[] {
  return [...teams].sort(
    (a, b) =>
      calculateRiskScore(b) - calculateRiskScore(a) ||
      a.progress - b.progress ||
      a.checkinRate - b.checkinRate,
  );
}

export function getRecommendedActions(teams: Team[]): string[] {
  return sortTeamsByRisk(teams).slice(0, 3).map((team) => {
    const question = team.requiredQuestions[0] ?? "핵심 위험 대응 상태를 확인하세요.";
    return `${team.teamName} ${question}`;
  });
}
